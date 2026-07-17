import 'package:bahram_family_manager/models/models.dart';

/// Short-lived in-memory cache so switching between recently viewed families is instant.
class FamilyDetailCache {
  FamilyDetailCache._();

  static final _data = <int, FamilyDetailModel>{};
  static final _at = <int, DateTime>{};
  static const _ttl = Duration(seconds: 60);

  static Future<FamilyDetailModel> load(
    int familyId,
    Future<FamilyDetailModel> Function() fetch,
  ) {
    final cached = _data[familyId];
    final cachedAt = _at[familyId];
    if (cached != null && cachedAt != null && DateTime.now().difference(cachedAt) < _ttl) {
      return Future.value(cached);
    }

    return fetch().then((model) {
      _data[familyId] = model;
      _at[familyId] = DateTime.now();
      return model;
    });
  }

  static void invalidate([int? familyId]) {
    if (familyId == null) {
      _data.clear();
      _at.clear();
      return;
    }
    _data.remove(familyId);
    _at.remove(familyId);
  }

  static void put(FamilyDetailModel model) {
    _data[model.id] = model;
    _at[model.id] = DateTime.now();
  }
}
