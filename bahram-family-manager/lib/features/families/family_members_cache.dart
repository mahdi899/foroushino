import 'package:bahram_family_manager/models/models.dart';

/// Short-lived cache for family member lists (switching families feels instant).
class FamilyMembersCache {
  FamilyMembersCache._();

  static final _entries = <int, _MembersCacheEntry>{};
  static const _ttl = Duration(seconds: 45);

  static PaginatedResult<FamilyMemberModel>? peek(int familyId) {
    final entry = _entries[familyId];
    if (entry == null) return null;
    if (DateTime.now().difference(entry.at) > _ttl) {
      _entries.remove(familyId);
      return null;
    }
    return entry.result;
  }

  static Future<PaginatedResult<FamilyMemberModel>> load(
    int familyId,
    Future<PaginatedResult<FamilyMemberModel>> Function() fetch,
  ) {
    final cached = peek(familyId);
    if (cached != null) return Future.value(cached);

    return fetch().then((result) {
      _entries[familyId] = _MembersCacheEntry(result: result, at: DateTime.now());
      return result;
    });
  }

  static void invalidate([int? familyId]) {
    if (familyId == null) {
      _entries.clear();
      return;
    }
    _entries.remove(familyId);
  }
}

class _MembersCacheEntry {
  _MembersCacheEntry({required this.result, required this.at});

  final PaginatedResult<FamilyMemberModel> result;
  final DateTime at;
}
