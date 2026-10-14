import 'package:miagames/core/storage/progress_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// ProgressStore sobre um shared_preferences em memória.
Future<ProgressStore> memoryStore([
  Map<String, Object> initial = const {},
]) async {
  SharedPreferences.setMockInitialValues(initial);
  return ProgressStore.load();
}
