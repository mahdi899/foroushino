import 'package:saat_mobile/core/api/api_client.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:uuid/uuid.dart';

class CallsService {
  CallsService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;
  final _uuid = const Uuid();

  Future<({CallSession call, Lead lead})> startCall(int leadId) async {
    final data = await _api.postData<Map<String, dynamic>>(
      '/calls/start',
      body: {'lead_id': leadId},
      map: (raw) => raw as Map<String, dynamic>,
    );
    return (
      call: CallSession.fromJson(data['call'] as Map<String, dynamic>),
      lead: Lead.fromJson(data['lead'] as Map<String, dynamic>),
    );
  }

  Future<void> submitResult({
    required int callId,
    required String result,
    String? note,
    int? durationSec,
    String? idempotencyKey,
  }) async {
    await _api.postData<dynamic>(
      '/calls/$callId/result',
      body: {
        'result': result,
        if (note != null && note.isNotEmpty) 'note': note,
        if (durationSec != null) 'duration_sec': durationSec,
      },
      headers: {
        'Idempotency-Key': idempotencyKey ?? _uuid.v4(),
      },
      map: (raw) => raw,
    );
  }
}
