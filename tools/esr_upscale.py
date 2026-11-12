import zipfile, pickle, numpy as np, collections, sys, time
from PIL import Image
from scipy import ndimage as nd
def load_pth(path):
    zf=zipfile.ZipFile(path); names=zf.namelist(); root=names[0].split('/')[0]
    class Storage:
        def __init__(s,key,dtype): s.key=key; s.dtype=dtype
    def rebuild(storage,offset,size,stride,*a):
        buf=np.frombuffer(zf.read(f'{root}/data/{storage.key}'),dtype=storage.dtype)
        n=int(np.prod(size)) if size else 1
        return np.lib.stride_tricks.as_strided(buf[offset:],shape=size,strides=[s*buf.itemsize for s in stride]).copy() if size else buf[offset:offset+1].copy()
    class U(pickle.Unpickler):
        def find_class(s,mod,name):
            if name=='_rebuild_tensor_v2': return rebuild
            if name=='OrderedDict': return collections.OrderedDict
            if name.endswith('Storage'): return {'FloatStorage':np.float32,'HalfStorage':np.float16,'LongStorage':np.int64}.get(name,np.float32)
            return super().find_class(mod,name)
        def persistent_load(s,pid):
            _,dt,key,loc,n=pid; return Storage(key,dt)
    return U(zf.open(f'{root}/data.pkl')).load()
import os, urllib.request, glob, subprocess
PTH='/tmp/esr_anime6B.pth'
if not os.path.exists(PTH):
    urllib.request.urlretrieve('https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth', PTH)
W=load_pth(PTH); W=W.get('params_ema',W)
def conv(x,name):  # x: C,H,W
    w=W[name+'.weight'].astype(np.float32); b=W[name+'.bias'].astype(np.float32)
    C,H,Wd=x.shape; xp=np.pad(x,((0,0),(1,1),(1,1)))
    cols=np.lib.stride_tricks.sliding_window_view(xp,(3,3),axis=(1,2))  # C,H,W,3,3
    cols=cols.transpose(1,2,0,3,4).reshape(H*Wd,C*9)
    out=cols@w.reshape(w.shape[0],-1).T+b
    return out.T.reshape(-1,H,Wd)
lr=lambda x: np.where(x>0,x,0.2*x)
def rdb(x,p):
    x1=lr(conv(x,p+'.conv1')); x2=lr(conv(np.concatenate([x,x1]),p+'.conv2')); x3=lr(conv(np.concatenate([x,x1,x2]),p+'.conv3'))
    x4=lr(conv(np.concatenate([x,x1,x2,x3]),p+'.conv4')); x5=conv(np.concatenate([x,x1,x2,x3,x4]),p+'.conv5'); return x5*0.2+x
def net(img):
    f=conv(img,'conv_first'); b=f
    for i in range(6):
        p=f'body.{i}'; o=rdb(b,p+'.rdb1'); o=rdb(o,p+'.rdb2'); o=rdb(o,p+'.rdb3'); b=o*0.2+b
    f=f+conv(b,'conv_body')
    up=lambda x: x.repeat(2,1).repeat(2,2)
    f=lr(conv(up(f),'conv_up1')); f=lr(conv(up(f),'conv_up2'))
    return conv(lr(conv(f,'conv_hr')),'conv_last')
def net_tiled(x,T=64,P=10):  # 分块推理，省内存；块间重叠 P 像素后裁掉
    C,H,Wd=x.shape; xp=np.pad(x,((0,0),(P,P),(P,P)),mode='edge'); out=np.zeros((3,H*4,Wd*4),np.float32)
    for y0 in range(0,H,T):
        for x0 in range(0,Wd,T):
            h=min(T,H-y0); w=min(T,Wd-x0)
            t=net(xp[:,y0:y0+h+2*P,x0:x0+w+2*P])
            out[:,y0*4:(y0+h)*4,x0*4:(x0+w)*4]=t[:,P*4:(P+h)*4,P*4:(P+w)*4]
    return out
def upscale(path,out,scale=2):
    im=np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)/255; A=im[...,3]
    # 透明处用最近的不透明颜色填，避免边缘发黑/发白
    idx=nd.distance_transform_edt(A<0.5,return_distances=False,return_indices=True)
    rgb=im[...,:3][idx[0],idx[1]]
    y=net_tiled(rgb.transpose(2,0,1)).clip(0,1).transpose(1,2,0)
    H,Wd=A.shape; hi=Image.fromarray((y*255).astype(np.uint8)).resize((Wd*scale,H*scale),Image.LANCZOS)
    a=Image.fromarray((A*255).astype(np.uint8)).resize((Wd*4,H*4),Image.BICUBIC)
    a=np.asarray(a).astype(np.float32)/255; a=np.clip((a-0.5)*1.6+0.5,0,1)  # 边缘收紧
    a=Image.fromarray((a*255).astype(np.uint8)).resize((Wd*scale,H*scale),Image.LANCZOS)
    o=hi.convert('RGBA'); o.putalpha(a); o.save(out)
if __name__=='__main__':
    # 用法：python3 tools/esr_upscale.py 角色1 角色2 ... [--budget 秒]
    # 把 assets/<角色>/ 下的动作帧（不含 portrait）用 Real-ESRGAN 动漫模型放大 2 倍，原地覆盖。
    # 已经放大过的帧（高度 >= 450）自动跳过，所以中断后重跑会接着做。
    args=sys.argv[1:]; budget=10**9
    if '--budget' in args: i=args.index('--budget'); budget=int(args[i+1]); args=args[:i]+args[i+2:]
    t0=time.time(); done=left=0
    for ch in args:
        for f in sorted(glob.glob(f'assets/{ch}/*.png')):
            if f.endswith('portrait.png') or Image.open(f).height>=450: continue
            if time.time()-t0>budget: left+=1; continue
            upscale(f,f); done+=1
            subprocess.run(['pngquant','--force','--ext','.png','--quality','75-95',f],check=False)
            print('ok',f,flush=True)
    print('本次完成',done,'帧，剩余',left,'帧')
