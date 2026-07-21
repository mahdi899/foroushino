import 'package:just_audio/just_audio.dart';
import 'package:video_player/video_player.dart';

import 'media_playback_source_stub.dart'
    if (dart.library.html) 'media_playback_source_web.dart'
    if (dart.library.io) 'media_playback_source_io.dart' as impl;

VideoPlayerController createVideoPlayerController(String source, {required bool isLocalFile}) {
  return impl.createVideoPlayerController(source, isLocalFile: isLocalFile);
}

Future<Duration?> setAudioPlayerSource(AudioPlayer player, String source, {required bool isLocalFile}) {
  return impl.setAudioPlayerSource(player, source, isLocalFile: isLocalFile);
}
