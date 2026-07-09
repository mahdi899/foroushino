/// Placeholder for future in-app VoIP (WebRTC / SIP).
/// When enabled, [AppConfig.voipEnabled] routes dialer to this service.
abstract class VoipCallService {
  Future<void> startCall({
    required String phone,
    required int leadId,
    required int callId,
  });

  Future<int> endCall();
}

class VoipCallServiceDisabled implements VoipCallService {
  @override
  Future<void> startCall({
    required String phone,
    required int leadId,
    required int callId,
  }) async {
    throw UnsupportedError('VoIP هنوز فعال نشده است.');
  }

  @override
  Future<int> endCall() async => 0;
}
