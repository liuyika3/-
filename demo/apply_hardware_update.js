const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI_SCRIPT =
  process.env.LARK_CLI_SCRIPT ||
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.npm-global', 'node_modules', '@larksuite', 'cli', 'scripts', 'run.js');
const DOC_URL = 'https://hcnjo5oqfjlb.feishu.cn/wiki/FoiHwoDrJix1Wzkgf8EcQhGznZf?from=from_copylink';

const intro = `万事嘴替。内置输入法功能，自然获取所有信息context。了解通讯录对象，发对应人设的话。骂死对头，高情商crush、导师、领导，直接表达爱to亲友。集中信息都app提升用户话术能力，分析社交处境，做日程管理。健康延展。app外手机内垃圾外卖自动拦截、晚睡拦截。app内食材/菜品一键下单。`;

const newTable = `
### 投资人硬核逻辑：底层机制与数据壁垒
> 核心思路：向投资人展示我们在“获取Context”、“跨期记忆”和“生理干预”上具备普通独立App不具备的护城河，且市面上有成熟对标可验证可行性。

<lark-table rows="4" cols="4" header-row="true" column-widths="180,260,260,200">
  <lark-tr>
    <lark-td>核心机制 (Idea)</lark-td>
    <lark-td>牛逼在哪 (差异化壁垒)</lark-td>
    <lark-td>投资人演示场景 (Aha Moment)</lark-td>
    <lark-td>市面现成App对标</lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>**1) 输入法context获取**</lark-td>
    <lark-td>绝大多数AI需用户“主动打开APP输入”，我们直接**截胡系统最高频动作**。实现伴随式、零阻力的Context获取，掌握最真实的私域语料库。</lark-td>
    <lark-td>在微信打出“这方案是狗屎重做吧”，键盘自动弹出【高情商版】气泡，点击瞬间替换为：“大方向没问题，细节我们需要再对齐一下。”</lark-td>
    <lark-td>[Grammarly](https://www.grammarly.com/) (输入法级润色)<br/>[Typewise](https://www.typewise.app/)<br/>讯飞输入法(AI辅助写词)</lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>**2) 时间轴数据库管理**</lark-td>
    <lark-td>大模型无时间概念。我们通过构建**时序数据库(Time-Series DB)**，将用户的碎片事件、情绪打上时间戳关联。建立极高的用户迁移成本（别人没你过去的记忆）。</lark-td>
    <lark-td>用户问“为什么我周三总想辞职？” AI不灌鸡汤，直接拉取数据因果图：“因为过去8周你周二晚都在讨论进度，建议周二晚9点开启强制勿扰模式。”</lark-td>
    <lark-td>[Rewind.ai / Limitless](https://www.limitless.ai/) (全局时间轴记忆)<br/>[Day One](https://dayoneapp.com/) (日记时序)</lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>**3) 独占硬件生态与潜意识Context**</lark-td>
    <lark-td>**背靠自有硬件厂商/供应链**，打破大厂（如苹果/华为）的数据封锁。我们能获取别人做不出的**「潜意识级行为Context」**：例如通过穿戴设备获取**手指微震颤与高频敲击**（精准识别焦虑与急躁）、**步态重力与频率异动**（识别压力徘徊或愤怒暴走）。将AI感知从“用户主动输入”前置到“身体本能微动作”。</lark-td>
    <lark-td>收到甩锅微信或面临高压沟通时，你还没开始打字，智能指环/手表已捕捉到你极其轻微的【手指无意识急促敲击】和【焦躁的徘徊步态】。在你即将情绪失控发火前，设备发出轻柔微震安抚，同时手机自动置顶一条高情商救场话术：“先别急着反驳，试试用这句回复让他自己把锅背回去……”</lark-td>
    <lark-td>[Oura Ring](https://ouraring.com/) (手指指环级体征监测)<br/>[Limitless Pendant](https://www.limitless.ai/) (便携穿戴硬件)<br/>*注：市面尚无将底层微动作体征与即时话术干预深度结合的成熟产品，这是真正的蓝海护城河。*</lark-td>
  </lark-tr>
</lark-table>
`;

const finalMd = intro + '\n\n' + newTable.trim() + '\n';
fs.writeFileSync(path.join(__dirname, 'apply_hardware_update.js_temp.md'), finalMd, 'utf8');

const result = execFileSync(
  'node',
  [CLI_SCRIPT, 'docs', '+update', '--doc', DOC_URL, '--as', 'user', '--mode', 'overwrite', '--markdown', finalMd],
  { encoding: 'utf8' }
);
console.log(result);
