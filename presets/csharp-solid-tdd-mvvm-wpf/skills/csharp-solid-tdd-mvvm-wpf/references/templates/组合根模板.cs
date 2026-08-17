// DI 组合根模板（表现层/App.xaml.cs 或独立组合根类）
// 规则：全应用唯一的对象装配点；ViewModel 一律 Transient；共享无状态服务可 Singleton。
using System.Windows;
using App.Application.抽象;
using App.Application.服务;
using App.Application.视图模型;
using App.Infrastructure.持久化;
using App.Infrastructure.仓储;
using App.Infrastructure.服务;
using App.Presentation.服务;      // I对话框服务 的 WPF 实现（MessageBox/Window）
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace App.Presentation;

public partial class App : Application
{
    private IHost? _宿主;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        _宿主 = Host.CreateDefaultBuilder()
            .ConfigureServices(配置服务)
            .Build();

        await _宿主.StartAsync();

        // 启动主窗口：从容器解析，不 new
        var 主窗口 = _宿主.Services.GetRequiredService<主窗口>();
        MainWindow = 主窗口;
        主窗口.Show();
    }

    private static void 配置服务(IServiceCollection services)
    {
        // ---- 基础设施层 ----
        services.AddDbContext<应用数据库上下文>(/* options */);
        services.AddSingleton<I订单仓储, 订单仓储>();
        services.AddSingleton<I文件存储, 文件存储>();

        // ---- 应用层（用例服务）----
        services.AddSingleton<I订单服务, 订单服务>();
        services.AddTransient<I对话框服务, Wpf对话框服务>();

        // ---- 表现层：ViewModel 与 View ----
        // ViewModel 全部 Transient：每个窗口/页面独立实例
        services.AddTransient<订单列表视图模型>();
        services.AddTransient<订单详情视图模型>();
        services.AddTransient<主视图模型>();

        // View 从容器解析（View-first 导航）
        services.AddTransient<主窗口>();
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        if (_宿主 is not null)
        {
            await _宿主.StopAsync();
            _宿主.Dispose();
        }
        base.OnExit(e);
    }
}
