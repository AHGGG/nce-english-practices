# Third-Party SDK Debugging: Lessons Learned

> **When to use**: 第三方 SDK 调用失败，需要诊断问题时

## 案例背景

**问题**: Deepgram TTS/STT 调用失败，尝试多次修复无效。

**根本原因**: 安装的是 Deepgram SDK **v5.3.0**，但 MCP 文档和网上资料多为 v3/v4 API，导致：
1. `from deepgram import SpeakOptions` 失败 - 该类在 v5 不存在
2. `speak.rest.v("1").save()` 方法签名不同
3. `listen.rest.v("1").transcribe_file()` 参数格式变了

## 解决方案

移除 SDK，改用 `httpx` 直接调用 REST API。

## 诊断清单

1. **检查 SDK 版本**
   ```bash
   uv pip show <package-name>
   ```

2. **对比文档版本**
   - 确认在线文档对应的 SDK 版本
   - 检查 Changelog 中的 Breaking Changes

3. **验证导入路径**
   ```python
   import <package>
   print(dir(<package>))  # 查看可用类和函数
   ```

4. **考虑 Raw API 替代**
   - 当 SDK 频繁出问题时，直接使用 REST API 更稳定
   - 参见 [Voice Integrations](./voice-integrations.md)

## 经验总结

> 当第三方 SDK 频繁出问题时，考虑直接使用 REST API。
