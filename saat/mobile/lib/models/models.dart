class SaatUser {
  const SaatUser({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.avatar,
    this.teamId,
    this.teamName,
    this.level = 1,
    this.points = 0,
    this.streak = 0,
    this.callGoal = 50,
    this.saleGoal = 5,
    this.availability = 'offline',
    this.roles = const [],
  });

  factory SaatUser.fromJson(Map<String, dynamic> json) {
    return SaatUser(
      id: json['id'] as int,
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString(),
      email: json['email']?.toString(),
      avatar: json['avatar']?.toString(),
      teamId: json['team_id'] as int?,
      teamName: json['team_name']?.toString(),
      level: json['level'] as int? ?? 1,
      points: json['points'] as int? ?? 0,
      streak: json['streak'] as int? ?? 0,
      callGoal: json['call_goal'] as int? ?? 50,
      saleGoal: json['sale_goal'] as int? ?? 5,
      availability: json['availability']?.toString() ?? 'offline',
      roles: (json['roles'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  final int id;
  final String name;
  final String? phone;
  final String? email;
  final String? avatar;
  final int? teamId;
  final String? teamName;
  final int level;
  final int points;
  final int streak;
  final int callGoal;
  final int saleGoal;
  final String availability;
  final List<String> roles;
}

class Lead {
  const Lead({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.city,
    this.source,
    this.temperature,
    this.status,
    this.callCount = 0,
    this.lastCallAt,
    this.lastNote,
    this.rating,
    this.isLocked = false,
    this.lockedUntil,
  });

  factory Lead.fromJson(Map<String, dynamic> json) {
    return Lead(
      id: json['id'] as int,
      firstName: json['first_name']?.toString() ?? '',
      lastName: json['last_name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      city: json['city']?.toString(),
      source: json['source']?.toString(),
      temperature: json['temperature']?.toString(),
      status: json['status']?.toString(),
      callCount: json['call_count'] as int? ?? 0,
      lastCallAt: json['last_call_at']?.toString(),
      lastNote: json['last_note']?.toString(),
      rating: json['rating'] as int?,
      isLocked: json['is_locked'] == true,
      lockedUntil: json['locked_until']?.toString(),
    );
  }

  String get fullName => '$firstName $lastName'.trim();

  final int id;
  final String firstName;
  final String lastName;
  final String phone;
  final String? city;
  final String? source;
  final String? temperature;
  final String? status;
  final int callCount;
  final String? lastCallAt;
  final String? lastNote;
  final int? rating;
  final bool isLocked;
  final String? lockedUntil;
}

class CallSession {
  const CallSession({
    required this.id,
    required this.leadId,
    this.startedAt,
  });

  factory CallSession.fromJson(Map<String, dynamic> json) {
    return CallSession(
      id: json['id'] as int,
      leadId: json['lead_id'] as int,
      startedAt: json['started_at']?.toString(),
    );
  }

  final int id;
  final int leadId;
  final String? startedAt;
}

class AgentHome {
  const AgentHome({
    this.callsToday = 0,
    this.salesToday = 0,
    this.callGoal = 50,
    this.saleGoal = 5,
    this.suggestedLead,
    this.suggestReason,
  });

  factory AgentHome.fromJson(Map<String, dynamic> json) {
    final stats = json['stats'] as Map<String, dynamic>? ?? {};
    final suggested = json['suggested_lead'] as Map<String, dynamic>?;
    return AgentHome(
      callsToday: stats['calls_today'] as int? ?? 0,
      salesToday: stats['sales_today'] as int? ?? 0,
      callGoal: stats['call_goal'] as int? ?? 50,
      saleGoal: stats['sale_goal'] as int? ?? 5,
      suggestedLead:
          suggested != null ? Lead.fromJson(suggested) : null,
      suggestReason: json['suggest_reason']?.toString(),
    );
  }

  final int callsToday;
  final int salesToday;
  final int callGoal;
  final int saleGoal;
  final Lead? suggestedLead;
  final String? suggestReason;
}

class VerifiedCallMetrics {
  const VerifiedCallMetrics({
    required this.durationSec,
    required this.numberMatched,
    required this.wasAnswered,
    this.dialedNumber,
  });

  final int durationSec;
  final bool numberMatched;
  final bool wasAnswered;
  final String? dialedNumber;
}
