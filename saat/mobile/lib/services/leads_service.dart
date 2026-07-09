import 'package:saat_mobile/core/api/api_client.dart';
import 'package:saat_mobile/models/models.dart';

class LeadsService {
  LeadsService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<List<Lead>> fetchLeads({int perPage = 100}) async {
    final data = await _api.getData<List<dynamic>>(
      '/leads',
      query: {'per_page': perPage},
      map: (raw) => raw as List<dynamic>,
    );
    return data
        .map((e) => Lead.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Lead> fetchLead(int id) async {
    final data = await _api.getData<Map<String, dynamic>>(
      '/leads/$id',
      map: (raw) => raw as Map<String, dynamic>,
    );
    return Lead.fromJson(data);
  }

  Future<({Lead lead, String? reason})> fetchNextLead() async {
    final data = await _api.postData<Map<String, dynamic>>(
      '/leads/next',
      map: (raw) => raw as Map<String, dynamic>,
    );
    return (
      lead: Lead.fromJson(data['lead'] as Map<String, dynamic>),
      reason: data['reason']?.toString(),
    );
  }

  Future<AgentHome> fetchAgentHome() async {
    final data = await _api.getData<Map<String, dynamic>>(
      '/home/agent',
      map: (raw) => raw as Map<String, dynamic>,
    );
    return AgentHome.fromJson(data);
  }
}
