# 完整解决方案布局与工程配置

> 中文化约定：除 C# 关键字与框架 API 名外，项目内所有标识符（目录、文件、类、接口、
> 方法、属性、字段、变量）与注释文案一律中文；下例仅保留 `App.*` 工程名作层标识
> （可整体替换为中文工程名，如 `领域`、`应用`、`基础设施`、`表现层`）。

## 目录结构

```
订单管理系统.sln
├── src/
│   ├── App.Domain/                  # 领域层：实体、值对象、领域规则、接口（无框架依赖）
│   │   ├── 实体/
│   │   ├── 值对象/
│   │   ├── 抽象/                    # I订单仓储、I折扣策略 等
│   │   └── 服务/                    # 领域服务（纯逻辑）
│   ├── App.Application/             # 应用层：视图模型、用例编排、Dto、UI 抽象接口
│   │   ├── 视图模型/
│   │   ├── Dto/
│   │   ├── 抽象/                    # I对话框服务、I导航服务、I剪贴板服务
│   │   └── 服务/                    # 用例服务（编排领域 + 基础设施接口）
│   ├── App.Infrastructure/          # 基础设施层：EF Core、文件、网络、系统服务实现
│   │   ├── 持久化/
│   │   ├── 仓储/
│   │   └── 服务/
│   └── App.Presentation/            # WPF 表现层：视图(XAML)、转换器、行为、组合根
│       ├── 视图/
│       ├── 转换器/
│       ├── 行为/
│       ├── 资源/
│       ├── App.xaml / App.xaml.cs   # 组合根（唯一 new/注册 DI 的地方）
│       └── AssemblyInfo.cs
└── tests/
    ├── App.Domain.Tests/            # xUnit + FluentAssertions + NSubstitute
    ├── App.Application.Tests/       # 视图模型/用例测试（无 WPF 引用）
    └── App.Infrastructure.Tests/    # 仓储/服务测试（可用真实内存库或 Fake）
```

## 工程文件关键配置

### App.Application.csproj（ViewModel 所在，可测试的关键）
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <LangVersion>latest</LangVersion>
    <RootNamespace>App.Application</RootNamespace>
  </PropertyGroup>
  <ItemGroup>
    <!-- CommunityToolkit.Mvvm 与 WPF 框架无关，纯类库可用 -->
    <PackageReference Include="CommunityToolkit.Mvvm" Version="8.*" />
    <ProjectReference Include="..\App.Domain\App.Domain.csproj" />
  </ItemGroup>
</Project>
```

### App.Presentation.csproj（WPF 工程）
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Hosting" Version="8.*" />
    <PackageReference Include="CommunityToolkit.Mvvm" Version="8.*" />
    <ProjectReference Include="..\App.Application\App.Application.csproj" />
    <ProjectReference Include="..\App.Infrastructure\App.Infrastructure.csproj" />
  </ItemGroup>
</Project>
```

### App.Application.Tests.csproj（测试工程）
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.*" />
    <PackageReference Include="xunit" Version="2.*" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.*" />
    <PackageReference Include="FluentAssertions" Version="6.*" />
    <PackageReference Include="NSubstitute" Version="5.*" />
    <ProjectReference Include="..\..\src\App.Application\App.Application.csproj" />
  </ItemGroup>
</Project>
```

## 依赖方向约束（编译期强制）

- `App.Domain`：不引用任何其他项目。
- `App.Application`：只引用 `App.Domain` + `CommunityToolkit.Mvvm`。
- `App.Infrastructure`：引用 `App.Domain`（+ EF Core 等第三方），**不引用 Application/Presentation**。
- `App.Presentation`：引用 Application、Infrastructure、Domain（组合根在此）。
- 测试项目只引用被测层。

> 若某层违反方向（例如 Application 引用了 WPF），应把该依赖抽象成接口下沉，或移到 Presentation。
