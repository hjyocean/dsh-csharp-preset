// 标准 ViewModel 模板（应用层/视图模型）
// 用法：复制到对应项目/视图模型目录，改命名空间与业务逻辑（全部中文命名）。
// 依赖：CommunityToolkit.Mvvm（纯类库，无 WPF 依赖，可单元测试）。
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace App.Application.视图模型;

/// <summary>
/// 订单列表视图模型 —— 展示 MVVM + SOLID(DIP) + TDD 的标准写法。
/// 只依赖抽象接口；所有可测逻辑都在这里，View 只负责绑定。
/// </summary>
public sealed partial class 订单列表视图模型 : ObservableObject
{
    private readonly I订单服务 _订单服务;   // 抽象：用例服务
    private readonly I对话框服务 _对话框服务; // 抽象：弹窗

    [ObservableProperty]
    private ObservableCollection<订单Dto> _订单列表 = [];

    [ObservableProperty]
    private 订单Dto? _选中订单;

    [ObservableProperty]
    private bool _是否繁忙;

    [ObservableProperty]
    private string? _错误消息;

    public 订单列表视图模型(I订单服务 订单服务, I对话框服务 对话框服务)
    {
        _订单服务 = 订单服务;
        _对话框服务 = 对话框服务;
    }

    /// <summary>加载订单；异步命令自带 CancellationToken 与防重入。</summary>
    [RelayCommand]
    private async Task 加载Async(CancellationToken ct)
    {
        if (是否繁忙) return; // 防重入

        是否繁忙 = true;
        错误消息 = null;
        try
        {
            var 最近订单 = await _订单服务.获取最近订单Async(ct);
            订单列表 = [.. 最近订单];
        }
        catch (OperationCanceledException)
        {
            // 用户取消：静默返回
        }
        catch (Exception ex)
        {
            错误消息 = ex.Message;
            await _对话框服务.显示错误Async("加载失败", ex.Message);
        }
        finally
        {
            是否繁忙 = false;
        }
    }

    /// <summary>删除选中订单：先确认，再调用服务，成功后刷新列表。</summary>
    [RelayCommand]
    private async Task 删除选中Async(CancellationToken ct)
    {
        if (选中订单 is null) return;

        var 已确认 = await _对话框服务.确认Async(
            "删除订单", $"确定删除订单 {选中订单.订单号} 吗？");
        if (!已确认) return;

        await _订单服务.删除Async(选中订单.Id, ct);
        await 加载Async(ct);
    }
}
