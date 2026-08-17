// 标准测试模板（应用层测试/视图模型）
// 用法：复制到对应测试项目，替换被测类型与断言（全部中文命名）。
// 依赖：xUnit + FluentAssertions + NSubstitute。
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace App.Application.Tests.视图模型;

public class 订单列表视图模型测试
{
    // ---- Red-Green-Refactor 第一步：先写失败测试 ----

    [Fact]
    public async Task 加载Async_服务返回订单_填充订单列表()
    {
        // Arrange
        var 服务 = Substitute.For<I订单服务>();
        var 订单列表 = new[]
        {
            new 订单Dto { Id = Guid.NewGuid(), 订单号 = "SO-001" },
            new 订单Dto { Id = Guid.NewGuid(), 订单号 = "SO-002" },
        };
        服务.获取最近订单Async(Arg.Any<CancellationToken>()).Returns(订单列表);

        var 视图模型 = new 订单列表视图模型(服务, Substitute.For<I对话框服务>());

        // Act
        await 视图模型.加载命令.ExecuteAsync(null);

        // Assert
        视图模型.订单列表.Should().HaveCount(2);
        视图模型.订单列表[0].订单号.Should().Be("SO-001");
        视图模型.是否繁忙.Should().BeFalse();
        视图模型.错误消息.Should().BeNull();
    }

    [Fact]
    public async Task 加载Async_服务抛出异常_设置错误消息()
    {
        // Arrange
        var 服务 = Substitute.For<I订单服务>();
        服务.获取最近订单Async(Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("db down"));

        var 视图模型 = new 订单列表视图模型(服务, Substitute.For<I对话框服务>());

        // Act
        await 视图模型.加载命令.ExecuteAsync(null);

        // Assert
        视图模型.错误消息.Should().Be("db down");
        视图模型.订单列表.Should().BeEmpty();
        视图模型.是否繁忙.Should().BeFalse();
    }

    [Fact]
    public async Task 加载Async_调用两次_不重入()
    {
        // Arrange：第一次调用未完成时，第二次调用应被防重入拦截
        var 服务 = Substitute.For<I订单服务>();
        var 闸门 = new TaskCompletionSource<IReadOnlyList<订单Dto>>();
        服务.获取最近订单Async(Arg.Any<CancellationToken>()).Returns(闸门.Task);

        var 视图模型 = new 订单列表视图模型(服务, Substitute.For<I对话框服务>());

        // Act
        var 第一次 = 视图模型.加载命令.ExecuteAsync(null);
        var 第二次 = 视图模型.加载命令.ExecuteAsync(null);

        闸门.SetResult([]);
        await Task.WhenAll(第一次, 第二次);

        // Assert
        await 服务.Received(1).获取最近订单Async(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task 删除选中Async_已确认_删除并刷新()
    {
        // Arrange
        var 服务 = Substitute.For<I订单服务>();
        var 对话框 = Substitute.For<I对话框服务>();
        对话框.确认Async(Arg.Any<string>(), Arg.Any<string>()).Returns(true);

        var 视图模型 = new 订单列表视图模型(服务, 对话框)
        {
            选中订单 = new 订单Dto { Id = Guid.NewGuid(), 订单号 = "SO-001" },
        };

        // Act
        await 视图模型.删除选中命令.ExecuteAsync(null);

        // Assert
        await 服务.Received(1).删除Async(
            Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await 服务.Received(1).获取最近订单Async(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task 删除选中Async_未确认_不删除()
    {
        // Arrange
        var 服务 = Substitute.For<I订单服务>();
        var 对话框 = Substitute.For<I对话框服务>();
        对话框.确认Async(Arg.Any<string>(), Arg.Any<string>()).Returns(false);

        var 视图模型 = new 订单列表视图模型(服务, 对话框)
        {
            选中订单 = new 订单Dto { Id = Guid.NewGuid(), 订单号 = "SO-001" },
        };

        // Act
        await 视图模型.删除选中命令.ExecuteAsync(null);

        // Assert
        await 服务.DidNotReceive().删除Async(
            Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}
