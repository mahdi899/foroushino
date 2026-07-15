/// پورت‌های ثابت توسعه — فقط یک آدرس در مرورگر: [appUrl].
class DevPorts {
  DevPorts._();

  /// پورت عمومی — همین را در مرورگر باز کنید.
  static const int web = 7357;

  /// پورت داخلی سرور Flutter (از طریق پروکسی dev-web در دسترس است).
  static const int webInternal = 7358;

  /// پورت Laravel (فقط داخلی؛ از مرورگر مستقیم باز نکنید).
  static const int api = 8010;

  static const String appUrl = 'http://localhost:$web';

  /// وب: API از همان origin (پروکسی `/api` → Laravel).
  static const String webApiBaseUrl = '$appUrl/api/v1';

  /// اندروید امولاتور → بک‌اند روی میزبان.
  static const String androidApiBaseUrl = 'http://10.0.2.2:$api/api/v1';

  /// دسکتاپ/ویندوز بدون پروکسی.
  static const String desktopApiBaseUrl = 'http://127.0.0.1:$api/api/v1';
}
