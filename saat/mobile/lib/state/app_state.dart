import 'package:flutter/foundation.dart';
import 'package:saat_mobile/core/api/api_exception.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/services/auth_service.dart';
import 'package:saat_mobile/services/leads_service.dart';

class AppState extends ChangeNotifier {
  AppState({
    AuthService? authService,
    LeadsService? leadsService,
  })  : _auth = authService ?? AuthService(),
        _leads = leadsService ?? LeadsService();

  final AuthService _auth;
  final LeadsService _leads;

  SaatUser? user;
  AgentHome? home;
  List<Lead> leads = [];
  bool bootstrapping = true;
  bool loading = false;
  String? error;

  Future<void> bootstrap() async {
    bootstrapping = true;
    notifyListeners();
    user = await _auth.restoreSession();
    if (user != null) {
      await refreshData();
    }
    bootstrapping = false;
    notifyListeners();
  }

  Future<void> login(String phone, String code) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      user = await _auth.verifyPhoneOtp(phone: phone, code: code);
      await refreshData();
    } on ApiException catch (e) {
      error = e.message;
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<String> requestOtp(String phone) => _auth.requestPhoneOtp(phone);

  Future<void> refreshData() async {
    loading = true;
    notifyListeners();
    try {
      final results = await Future.wait([
        _leads.fetchAgentHome(),
        _leads.fetchLeads(),
      ]);
      home = results[0] as AgentHome;
      leads = results[1] as List<Lead>;
      error = null;
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    user = null;
    home = null;
    leads = [];
    notifyListeners();
  }
}
