# 平衡测试结果（每个角色每档 N=1000 局，解锁档 4，进阶 0，种子 1，commit 8f5495c）

生成时间：2026-11-13T21:22:22.658Z

新手机器人：很少想起用药水、选牌只看稀有度。熟练机器人：会用药水、按角色流派选牌。

## 强化训练 AI（用 tools/weights.json 里学到的打法）

| 角色 | 第一章通关 | 第二章通关 | 第三章通关 | 第一章 Boss 战胜率 | 通关剩余生命 | 真Boss胜率 | 超时 | 最常死在 |
|---|---|---|---|---|---|---|---|---|
| erin | 93.7% | 84.7% | 82.6% | 94% | 67 | 99% | 0 | 二·Boss:death_knight(35)、二·Boss:wolf_lord(27)、一·Boss:gob_warlord(27)、一·Boss:gob_king(24)、二·Boss:vamp_count(15)、一·Boss:gob_archshaman(12)、三·精英:d_holy+d_whelp(7)、二·精英:necromancer+skeleton+zombie(7) |
| feiyue | 92.8% | 85.2% | 83.8% | 93% | 71 | 99% | 0 | 一·Boss:gob_warlord(39)、一·Boss:gob_king(28)、二·Boss:death_knight(25)、二·Boss:wolf_lord(19)、二·gargoyle+gargoyle(8)、二·精英:necromancer+skeleton+zombie(7)、二·Boss:vamp_count(6)、三·Boss:dev_boss(5) |
| gu | 98.7% | 96.6% | 94.0% | 99% | 69 | 100% | 0 | 三·精英:d_holy+d_whelp(10)、一·Boss:gob_king(8)、二·Boss:vamp_count(6)、二·Boss:death_knight(6)、三·精英:d_arch(5)、一·Boss:gob_warlord(4)、二·Boss:wolf_lord(3)、三·Boss:dev_boss(3) |
| hero | 94.6% | 84.4% | 79.3% | 95% | 60 | 98% | 0 | 二·Boss:death_knight(32)、二·Boss:wolf_lord(30)、一·Boss:gob_warlord(29)、一·Boss:gob_king(21)、二·精英:necromancer+skeleton+zombie(13)、二·Boss:vamp_count(11)、三·精英:d_holy+d_whelp(11)、三·d_frost+d_storm(9) |
| heroine | 91.2% | 81.9% | 79.0% | 93% | 67 | 99% | 0 | 一·Boss:gob_king(61)、二·Boss:wolf_lord(39)、二·Boss:death_knight(24)、一·Boss:gob_warlord(11)、二·精英:necromancer+skeleton+zombie(10)、三·精英:d_arch(8)、一·精英:goblin+orc_overseer+goblin(7)、二·精英:necromancer+skeleton(5) |
| mia | 88.6% | 83.8% | 83.2% | 89% | 65 | 99% | 0 | 一·Boss:gob_king(52)、一·Boss:gob_warlord(47)、二·Boss:death_knight(21)、二·Boss:wolf_lord(15)、一·Boss:gob_archshaman(13)、二·精英:necromancer+skeleton+zombie(4)、二·Boss:vamp_count(3)、三·d_storm+d_egg(2) |
| miko | 86.0% | 76.3% | 75.8% | 86% | 78 | 97% | 0 | 一·Boss:gob_warlord(64)、一·Boss:gob_king(63)、二·Boss:death_knight(40)、二·Boss:wolf_lord(38)、一·Boss:gob_archshaman(13)、二·精英:necromancer+skeleton+zombie(10)、二·Boss:vamp_count(6)、二·精英:necromancer+skeleton(2) |
| sylvie | 97.7% | 92.6% | 89.4% | 98% | 68 | 94% | 0 | 二·Boss:vamp_count(18)、二·Boss:wolf_lord(17)、一·Boss:gob_king(14)、二·Boss:death_knight(14)、三·Boss:dev_boss(9)、三·d_frost+d_storm(6)、三·精英:d_arch(5)、一·Boss:gob_warlord(5) |
| witch | 79.6% | 69.1% | 66.3% | 81% | 64 | 100% | 0 | 一·Boss:gob_warlord(98)、一·Boss:gob_king(71)、二·Boss:death_knight(39)、二·Boss:wolf_lord(37)、一·Boss:gob_archshaman(21)、二·精英:necromancer+skeleton+zombie(16)、三·精英:d_arch(9)、一·精英:gob_kid+gob_shaman+gob_kid(7) |
