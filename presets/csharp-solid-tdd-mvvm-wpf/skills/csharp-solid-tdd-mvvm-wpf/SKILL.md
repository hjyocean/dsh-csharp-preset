---
name: csharp-solid-tdd-mvvm-wpf
description: >-
  C# WPF 桌面开发专用设计模式：SOLID + TDD + MVVM 一体化规范。包含分层架构与项目结构、
  依赖注入组合根、CommunityToolkit.Mvvm 绑定/命令模板、xUnit 测试纪律与 Red-Green-Refactor
  工作流。处理任何 C# / .NET / WPF 桌面任务的架构设计、功能开发、重构或测试时加载。
whenToUse: >-
  任务涉及 C# / .NET / WPF 桌面应用程序开发时使用；当任务包含 MVVM 分层、依赖注入、
  SOLID 原则、单元测试（TDD）或 WPF 数据绑定/命令时尤其适用。
metadata:
  version: "1.1.0"
  tags: [csharp, dotnet, wpf, mvvm, solid, tdd, di, desktop]
  language: zh-CN
---

# C# SOLID + TDD + MVVM + WPF 专用设计模式

本模式把 **SOLID 原则、TDD 测试纪律、MVVM 架构、WPF 绑定机制** 组合成一套可执行的开发规范。
目标：可测试、可维护、可替换的 WPF 桌面应用。

## 1. 总则（先读）

1. **依赖方向永远向内**：View → ViewModel → Service/UseCase → Repository/Infrastructure → Domain。上层依赖抽象（接口），绝不依赖具体实现或 WPF 框架类型。
2. **一切业务逻辑与 ViewModel 必须可单元测试**：View 只做"显示与交互收集"，没有任何可测逻辑。
3. **先写失败测试，再写实现**（Red-Green-Refactor），每次功能迭代都从测试开始。
4. **组合根唯一**：对象装配只发生在 `App.xaml.cs` 的 DI 容器注册处；ViewModel 构造函数只接收接口。
5. **禁止静态服务定位器 / 全局单例业务服务**（如 `ServiceLocator.Current`、静态 `Db`）。依赖必须显式注入。
6. **全应用中文化**：除 C# 语言关键字与 .NET/第三方 API 名等必要英文外，所有代码标识符与文案一律用中文（见第 7 节《中文化命名规范》）。
7. **禁止猜测式排错**：遇到问题且无法直接定位原因时，不得靠猜或盲目改码；首选单元测试复现定位，其次 debug 输出缩小范围，最后结合用户协助确认（详见 8.1）。

## 2. 架构分层与项目结构

采用经典四层 + 测试工程（每层一个测试项目）。完整布局与 `.csproj` 关键配置见
`references/ProjectLayout.md`。核心约定：

| 层 | 项目（中文命名示例） | 职责 | 禁止 |
|---|---|---|---|
| Domain | `领域`（原 `App.Domain`） | 实体、值对象、领域规则、仓储/服务接口 | 引用任何框架/WPF |
| Application | `应用`（原 `App.Application`） | 用例编排、ViewModel、DTO、导航/对话框接口 | 引用 WPF；只允许 CommunityToolkit.Mvvm |
| Infrastructure | `基础设施`（原 `App.Infrastructure`） | 仓储实现、EF Core、文件/网络/系统服务 | 被上层反向引用 |
| Presentation | `表现层`（原 `App.Presentation`，WPF） | 视图(XAML)、转换器、行为、App.xaml 组合根 | 除组合根外不得 `new` 服务 |

**关键点**：ViewModel 放在 `应用` 层（纯类库），使 ViewModel 测试不依赖 WPF 程序集
与 UI 线程。`表现层` 只通过 `DataTemplate` 把 View 映射到 ViewModel。
> 注：项目名可保留英文原 `App.*` 前缀（属工程标识，视为必要英文），但层内
> 命名空间、文件与所有类型一律中文化（见 7.1）。

## 3. SOLID 落地规则

### S — 单一职责
- 一个类只做一件事：ViewModel 管状态与命令；服务管业务编排；仓储管持久化；映射器管对象转换。
- View 的 code-behind 只允许 View 专属逻辑（拖拽、窗口行为）；业务分支一律进 ViewModel。

### O — 开闭原则
- 通过接口 + 策略/装饰器扩展，不修改已有类。例如折扣策略：
  ```csharp
  public interface I折扣策略 { decimal 计算(decimal 总额); }
  // 新增策略 = 新增类 + 注册到 DI，绝不改动现有 switch
  ```

### L — 里氏替换
- 接口的实现可自由替换（如 `I文件存储` 的磁盘/云实现），调用方无感知。
- 派生类不削弱基类契约；不抛调用方未预期的异常。

### I — 接口隔离
- 拆小接口，按调用方需要定义。`I订单仓储` 优于万能 `IRepository<T>`：
  ```csharp
  public interface I订单仓储
  {
      Task<订单?> 按Id获取Async(Guid 订单号, CancellationToken ct);
      Task<IReadOnlyList<订单>> 按客户获取Async(Guid 客户号, CancellationToken ct);
      Task 添加Async(订单 订单, CancellationToken ct);
  }
  ```

### D — 依赖倒置
- ViewModel 只依赖接口；实现通过构造函数注入：
  ```csharp
  public sealed partial class 订单列表视图模型 : ObservableObject
  {
      private readonly I订单仓储 _订单仓储;   // 抽象
      private readonly I对话框服务 _对话框服务;    // 抽象
      public 订单列表视图模型(I订单仓储 订单仓储, I对话框服务 对话框服务) { ... }
  }
  ```

## 4. MVVM 分层职责与 WPF 绑定规范

### 4.1 Model
- 领域对象（`App.Domain`）与 DTO（`App.Application`）。Model 不含 `INotifyPropertyChanged`。

### 4.2 ViewModel（`App.Application`）
- 使用 **CommunityToolkit.Mvvm**：`[ObservableProperty]` 生成属性，`[RelayCommand]` 生成命令。
- 异步命令用 `IAsyncRelayCommand`，支持 `CancellationToken`：
  ```csharp
  public sealed partial class 订单详情视图模型 : ObservableObject
  {
      [ObservableProperty] private 订单Dto? _订单;
      [ObservableProperty] private bool _是否繁忙;
      [ObservableProperty] private string? _错误消息;

      [RelayCommand]
      private async Task 加载Async(CancellationToken ct)
      {
          是否繁忙 = true;
          错误消息 = null;
          try
          {
              订单 = await _订单仓储.按Id获取Async(订单号, ct);
          }
          catch (OperationCanceledException) { /* 用户取消，静默 */ }
          catch (Exception ex) { 错误消息 = ex.Message; }
          finally { 是否繁忙 = false; }
      }
  }
  ```
- 跨 ViewModel 通信用 `WeakReferenceMessenger`（CommunityToolkit.Mvvm），不用事件总线单例。
- ViewModel 中**禁止**出现 `Dispatcher`、`Application`、`MessageBox`、`Window`、`ICommand` 之外的 WPF 类型；弹窗、导航、剪贴板都抽象成接口（`I对话框服务`、`I导航服务`）注入。

### 4.3 View（`App.Presentation`，XAML）
- `DataContext` 由 DataTemplate / 导航服务注入，XAML 内不做装配。
- 用 `{Binding}` + `x:Bind` 风格保持单向数据流：属性驱动 UI，命令响应用户操作。
- 只读状态用 `Mode=OneWay`，用户输入 `Mode=TwoWay` + `UpdateSourceTrigger=PropertyChanged`。
- 验证：ViewModel 实现 `INotifyDataErrorInfo`（`[ObservableProperty]` 配合校验），XAML 用
  `ValidatesOnNotifyDataErrors=True`；不用 WPF 内置 `ValidationRule` 承载业务校验。
- 需要转换的展示逻辑放 Converter；需要视觉行为的（拖放、焦点）放 Behavior，均不写业务。

### 4.4 绑定示例
```xml
<Window ... xmlns:vm="clr-namespace:App.Application.视图模型;assembly=App.Application">
    <Window.DataContext>
        <!-- 仅设计时：<d:DesignInstance>；运行时 DataContext 由组合根/导航注入 -->
    </Window.DataContext>
    <StackPanel>
        <TextBlock Text="{Binding 订单.订单号, Mode=OneWay}"/>
        <Button Content="刷新"
                Command="{Binding 加载命令}"
                IsEnabled="{Binding 是否繁忙, Converter={StaticResource 取反转换器}}"/>
        <TextBlock Text="{Binding 错误消息}" Foreground="Red" Visibility="{Binding 错误消息,
                   Converter={StaticResource 空值折叠转换器}}"/>
    </StackPanel>
</Window>
```

## 5. TDD 测试纪律（Red-Green-Refactor）

### 5.1 工作流（每个功能必走）
1. **Red**：先写一个失败的单元测试，描述期望行为（Arrange-Act-Assert）。
2. **Green**：写最小实现让测试通过（可临时硬编码，先过再优化）。
3. **Refactor**：在测试保护下重构，落实 SOLID（抽接口、拆类、去重复）。
4. **验证**：`dotnet test` 全绿后，再写下一个测试。测试不通过 = 功能未完成。

### 5.2 技术选型
- 测试框架：**xUnit** + **FluentAssertions**（可读断言）+ **NSubstitute**（mock，或 Moq）。
- 每层一个测试项目：`App.Domain.Tests`、`App.Application.Tests`、`App.Infrastructure.Tests`。
- WPF 项目本身不写单测（XAML 不可单测）；ViewModel/Converters 的测试放 `App.Application.Tests`。

### 5.3 测试命名与结构
测试类名与测试方法名一律中文化，保留 `方法_状态_期望行为` 结构：
```csharp
public class 订单详情视图模型测试
{
    [Fact]
    public async Task 加载Async_订单存在_设置订单属性()
    {
        // Arrange
        var 仓储 = Substitute.For<I订单仓储>();
        var 订单 = new 订单Dto { Id = Guid.NewGuid(), 订单号 = "SO-001" };
        仓储.按Id获取Async(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(订单);
        var 视图模型 = new 订单详情视图模型(仓储, Substitute.For<I对话框服务>());

        // Act
        await 视图模型.加载命令.ExecuteAsync(null);

        // Assert
        视图模型.订单.Should().BeSameAs(订单);
        视图模型.是否繁忙.Should().BeFalse();
        视图模型.错误消息.Should().BeNull();
    }

    [Fact]
    public async Task 加载Async_仓储抛出异常_设置错误消息()
    {
        // Arrange
        var 仓储 = Substitute.For<I订单仓储>();
        仓储.按Id获取Async(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("db down"));
        var 视图模型 = new 订单详情视图模型(仓储, Substitute.For<I对话框服务>());

        // Act
        await 视图模型.加载命令.ExecuteAsync(null);

        // Assert
        视图模型.错误消息.Should().Be("db down");
        视图模型.订单.Should().BeNull();
    }
}
```

### 5.4 测试什么
- Domain 规则（价格计算、状态机、校验）—— 纯逻辑，覆盖最高优先级。
- ViewModel：命令执行、状态迁移、异常路径、可空/边界输入、取消。
- 用 Fake/Mock 隔离边界（数据库、文件、网络、对话框），不写慢的集成测试当单测。
- 不必测：XAML、绑定字符串本身、简单属性 getter/setter（由框架保证）。

## 6. 依赖注入与组合根

- 用 `Microsoft.Extensions.Hosting` + `Microsoft.Extensions.DependencyInjection`（WPF 下 Host 负责
  `IServiceProvider`，组合根只做注册）。
- **组合根唯一**：`App.xaml.cs` 的 `OnStartup` 中注册全部服务与 ViewModel（注册为 `Transient`），
  View 由 `DataTemplate` 绑定到 ViewModel 类型，导航服务解析 Window。
- ViewModel 一律 `Transient`（每次新建），避免跨窗口共享可变状态；真正的共享状态放 Domain/Service 单例。
- 完整组合根示例见 `references/templates/组合根模板.cs`。

## 7. 代码约定

### 7.1 中文化命名规范（强制）

**原则**：除 C# 语言关键字（`class`、`public`、`Task`、`await` 等）与 .NET/第三方 API 名
（`ObservableObject`、`RelayCommand`、`CancellationToken`、`Guid` 等）这些"必要英文"外，
**所有用户可命名的内容一律使用中文**：

| 范畴 | 要求 | 示例 |
|---|---|---|
| 项目/工程名 | 中文（保留 `App` 层前缀惯例可选） | `订单管理系统`、`App.Domain` |
| 命名空间 | 中文 | `App.Application.视图模型` |
| 文件名 | 中文 | `订单列表视图模型.cs` |
| 类名 | 中文 | `订单列表视图模型`、`订单` |
| 接口名 | `I` + 中文 | `I订单仓储`、`I对话框服务` |
| 方法名 | 中文，异步加 `Async` 后缀 | `加载Async`、`删除选中Async` |
| 属性名 | 中文 | `订单`、`是否繁忙`、`错误消息` |
| 字段名 | `_` + 中文驼峰 | `_订单仓储`、`_是否繁忙` |
| 局部变量/参数 | 中文 | `var 订单 = ...`、`(Guid 订单号, ...)` |
| 枚举类型与成员 | 中文 | `订单状态.已创建` |
| 测试类/测试方法 | 中文，保留 `方法_状态_期望行为` 结构 | `订单列表视图模型测试.加载Async_服务返回订单_填充订单列表` |
| XAML 资源键 | 中文 | `x:Key="取反转换器"` |
| 绑定路径 | 中文 | `{Binding 订单.订单号}` |
| 注释/Doc 注释 | 中文 | `/// <summary>加载订单列表。</summary>` |
| 字符串/日志/弹窗 | 中文 | `"加载失败"`、`"删除订单"` |
| DTO 后缀 | 保留 `Dto`（技术缩写视为必要英文） | `订单Dto` |

**兼容 C# 惯例**：接口 `I` 前缀、私有字段 `_` 前缀、异步 `Async` 后缀、测试命名
`方法_状态_期望行为` 全部保留，只是主体词换成中文。禁拼音缩写（如 `DdglVm`），
禁英文通用词（如 `OrderListViewModel`、`IsBusy`）——一律 `订单列表视图模型`、`是否繁忙`。

**示例**（对照"旧英文写法 → 新中文写法"）：
```csharp
// 旧：public sealed partial class OrderListViewModel : ObservableObject
public sealed partial class 订单列表视图模型 : ObservableObject
{
    // 旧：private readonly IOrderService _orderService;
    private readonly I订单服务 _订单服务;

    // 旧：[ObservableProperty] private bool _isBusy;
    [ObservableProperty]
    private bool _是否繁忙;

    // 旧：public async Task LoadAsync(CancellationToken ct)
    [RelayCommand]
    private async Task 加载Async(CancellationToken ct)
    {
        是否繁忙 = true;
        try
        {
            var 订单列表 = await _订单服务.获取最近订单Async(ct);
            订单 = [.. 订单列表];
        }
        finally { 是否繁忙 = false; }
    }
}
```

### 7.2 其它代码约定

- 目标框架：.NET 8+；启用 `<Nullable>enable</Nullable>`、`ImplicitUsings`、`LangVersion` latest、
  文件范围命名空间。
- 命名（在中文规则之上的补充）：接口 `I` 前缀；异步方法 `Async` 后缀；私有字段 `_中文驼峰`；
  测试方法 `方法_状态_期望行为`（主体中文）。
- 异步：全链路 `async/await`，禁止 `.Result`/`.Wait()`；UI 侧命令用 `IAsyncRelayCommand`，
  长任务注入 `CancellationToken` 并可取消。
- 错误处理：业务异常进 ViewModel 的 `错误消息`/`I对话框服务` 呈现；基础设施层转换异常；
  不吞异常，不裸 `catch {}`。
- 序列化/配置：用 `IOptions<T>` 注入配置，不读静态 `ConfigurationManager`。

## 8. Agent 开发工作流（本模式下的强制步骤）

实现任何 C#/WPF 功能时按此顺序执行：

1. **澄清行为**：明确输入、输出、异常、取消语义（必要时先问用户）。
2. **写测试（Red）**：在对应测试项目添加失败测试；`dotnet test --filter <新测试>` 确认失败。
3. **最小实现（Green）**：补 Domain/Application/Infrastructure 代码，让测试通过。
4. **重构（Refactor）**：检查 SOLID 五条是否满足；抽取接口；确认 ViewModel 无 WPF 依赖。
5. **接 View**：在 `App.Presentation` 加 XAML 绑定/命令，注册 DI，验证 DataContext 注入。
6. **全量验证**：`dotnet build`（0 warning 目标）+ `dotnet test` 全绿。
7. **汇报**：说明改动文件、测试覆盖点、未覆盖风险。

### 8.1 问题定位（无法直接定位原因时的强制流程）

遇到问题且无法立即定位根因时，**禁止猜测或盲目改码**，按以下顺序排查：

1. **单元测试定位（首选）**：为可疑行为编写或运行针对性测试（必要时先 Red 复现），用测试输出固定行为边界、判断是否回归；能在测试中复现的问题，直接在测试保护下修复。
2. **debug 输出定位（次选）**：测试不足以覆盖/复现时，用日志、`Debug.WriteLine`/`Console` 输出、调试器断点观察中间状态，逐步缩小到具体模块与代码行；定位后把结论沉淀为测试（防回归）。
3. **用户协助（最后）**：仍未定位时，整理可复现材料（失败测试输出、日志、异常堆栈、最小复现步骤）与已排查结论，向用户说明并请求协助确认环境、数据或期望行为；**得到确认前不擅自改码**。

## 9. 验证命令

```bash
dotnet build <Solution>.sln            # 编译全解决方案
dotnet test <Solution>.sln             # 运行全部单元测试
dotnet test --filter "FullyQualifiedName~订单详情视图模型测试"  # 只跑某测试类
dotnet format                          # 统一代码风格
```

## 10. 参考资源

- `references/ProjectLayout.md` — 完整解决方案目录与工程文件配置
- `references/templates/标准视图模型模板.cs` — 标准 ViewModel 模板
- `references/templates/视图模型测试模板.cs` — 标准测试模板
- `references/templates/组合根模板.cs` — DI 组合根模板
