import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/media_size_guard.dart';
import 'package:bahram_family_manager/core/utils/local_media_url.dart';
import 'package:bahram_family_manager/features/posts/widgets/family_picker_sheet.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_action_results_panel.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_editor_action_bar.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_schedule_sheet.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_type_selector.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/models/upload_progress.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_progress_overlay.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/media/voice_recorder_panel.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_dialog.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

class PostEditorScreen extends StatefulWidget {
  const PostEditorScreen({super.key, this.post});

  final FamilyPostModel? post;

  @override
  State<PostEditorScreen> createState() => _PostEditorScreenState();
}

class _PostEditorScreenState extends State<PostEditorScreen> {
  final _textCtrl = TextEditingController();
  final _actionPromptCtrl = TextEditingController();
  final _followUpMinutesCtrl = TextEditingController();
  final _followUpMessageCtrl = TextEditingController();
  final _scaleMinCtrl = TextEditingController();
  final _scaleMaxCtrl = TextEditingController();
  final List<TextEditingController> _optionControllers = [];

  FamilyPostModel? _post;
  late String _type;
  late String _audienceMode;
  late bool _isImportant;
  bool _commentsEnabled = true;
  final Set<int> _selectedFamilyIds = {};
  final _actionDaysCtrl = TextEditingController(text: '7');
  final _aiTopicCtrl = TextEditingController();

  FamilyMediaRef? _mediaRef;
  Uint8List? _localPreviewBytes;
  String? _localPreviewUrl;
  /// Image / album attachments (one or many). Voice/video still use [_mediaRef].
  final List<_AttachedImage> _images = [];
  MediaUploadPhase _mediaPhase = MediaUploadPhase.idle;
  double _uploadProgress = 0;
  int _uploadSentBytes = 0;
  int _uploadTotalBytes = 0;
  bool _optimizeImages = true;
  bool _optimizeDefaultLoaded = false;

  bool _actionEnabled = false;
  String _actionType = 'commitment';

  bool _saving = false;
  bool _aiLoading = false;
  List<String> _aiSuggestions = [];
  String _aiTone = 'صمیمی، انگیزشی و کوتاه';

  static const _aiToneOptions = [
    'صمیمی، انگیزشی و کوتاه',
    'آموزشی و عملی',
    'رسمی و حرفه‌ای',
    'صمیمی و داستانی',
  ];

  @override
  void initState() {
    super.initState();
    _post = widget.post;
    _type = _post?.type ?? 'text';
    _audienceMode = _post?.audienceMode ?? 'all';
    _isImportant = _post?.isImportant ?? false;
    _commentsEnabled = _post?.commentsEnabled ?? true;
    _selectedFamilyIds.addAll(_post?.targetFamilyIds ?? []);

    final textBlock = _post?.blocks.firstWhereOrNull((b) => b.type == 'text');
    _textCtrl.text = textBlock?.textContent ?? '';

    if (_isImagePost) {
      for (final block in _post?.blocks ?? const <FamilyPostBlockModel>[]) {
        if (block.type == 'image' && block.media != null) {
          final attached = _AttachedImage(media: block.media);
          attached.phase = block.media!.isReady
              ? MediaUploadPhase.ready
              : MediaUploadPhase.processing;
          _images.add(attached);
        }
      }
    } else {
      final mediaBlock = _post?.blocks.firstWhereOrNull((b) => b.media != null);
      _mediaRef = mediaBlock?.media;
      if (_mediaRef != null && _mediaRef!.isReady) {
        _mediaPhase = MediaUploadPhase.ready;
      } else if (_mediaRef != null) {
        _mediaPhase = MediaUploadPhase.processing;
        WidgetsBinding.instance.addPostFrameCallback((_) => _refreshPendingMedia());
      }
    }
    if (_images.any((img) => img.media != null && !img.media!.isReady)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _refreshPendingMedia());
    }

    final action = _post?.actions.firstWhereOrNull((_) => true);
    if (action != null) {
      _actionEnabled = true;
      _actionType = action.type;
      _actionPromptCtrl.text = action.prompt;
      if (action.activeUntil != null) {
        final until = DateTime.tryParse(action.activeUntil!);
        if (until != null) {
          final days = until.difference(DateTime.now()).inDays.clamp(1, 365);
          _actionDaysCtrl.text = days.toString();
        }
      }
      for (final opt in action.options) {
        _optionControllers.add(TextEditingController(text: opt.label));
      }
    }
    if (_optionControllers.isEmpty) {
      _optionControllers.add(TextEditingController());
      _optionControllers.add(TextEditingController());
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_optimizeDefaultLoaded) {
      _optimizeDefaultLoaded = true;
      _loadDefaultOptimizeSetting();
    }
  }

  Future<void> _loadDefaultOptimizeSetting() async {
    try {
      final settings = await context.read<AppState>().manager.getSettings();
      if (!mounted) return;
      setState(() => _optimizeImages = settings.mediaPipeline?.optimizeImages ?? true);
    } catch (_) {
      // Keep default true when settings are unavailable offline.
    }
  }

  @override
  void dispose() {
    _clearLocalPreview();
    _textCtrl.dispose();
    _actionPromptCtrl.dispose();
    _followUpMinutesCtrl.dispose();
    _followUpMessageCtrl.dispose();
    _scaleMinCtrl.dispose();
    _scaleMaxCtrl.dispose();
    _actionDaysCtrl.dispose();
    _aiTopicCtrl.dispose();
    for (final c in _optionControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _clearLocalPreview() async {
    final url = _localPreviewUrl;
    _localPreviewBytes = null;
    _localPreviewUrl = null;
    await revokeLocalMediaUrl(url);
  }

  Future<void> _clearAllMedia() async {
    await _clearLocalPreview();
    _mediaRef = null;
    _images.clear();
  }

  Future<void> _changePostType(String next) async {
    final current = _isImagePost ? 'image' : _type;
    if (next == current) return;
    await _clearAllMedia();
    if (!mounted) return;
    setState(() {
      _type = next;
      _mediaPhase = MediaUploadPhase.idle;
      _uploadProgress = 0;
      _uploadSentBytes = 0;
      _uploadTotalBytes = 0;
    });
  }

  void _applyMainUploadState(UploadProgress upload) {
    _mediaPhase = upload.phase;
    _uploadProgress = upload.fraction;
    _uploadSentBytes = upload.sentBytes;
    _uploadTotalBytes = upload.totalBytes;
  }

  bool get _mediaBusy => _mediaPhase.isActive || _images.any((img) => img.phase.isActive);

  String? get _mediaStatusLabel {
    if (!_mediaPhase.isActive) return null;
    return _mediaPhase.statusLabel((_uploadProgress * 100).clamp(0, 100));
  }

  bool get _isImagePost => _type == 'image' || _type == 'image_album';

  String get _selectorType => _isImagePost ? 'image' : _type;

  String get _payloadType {
    if (_isImagePost) {
      final count = _images.where((img) => img.media != null).length;
      return count >= 2 ? 'image_album' : 'image';
    }
    return _type;
  }

  bool get _hasSingleMediaAttached =>
      _mediaRef != null || _localPreviewBytes != null;

  bool get _showsSingleMediaSection =>
      _hasSingleMediaAttached ||
      _mediaPhase != MediaUploadPhase.idle;

  bool get _hasRequiredMedia {
    if (_type == 'text') return true;
    if (_isImagePost) return _images.any((img) => img.media != null);
    return _mediaRef != null;
  }

  double get _singleMediaPreviewHeight {
    if (_type == 'voice') {
      return _mediaPhase.isActive ? 160 : 88;
    }
    return (_mediaRef?.isAudio ?? _type == 'voice') ? 88 : 220;
  }

  bool _rejectOversizeMedia(int bytes) {
    final message = MediaSizeGuard.oversizeMessage(bytes);
    if (message == null) return false;
    if (mounted) showAppSnackBar(context, message);
    return true;
  }

  Widget _buildSingleMediaUploadPreview({
    required Color subtle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_mediaStatusLabel != null)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Text(
              _mediaStatusLabel!,
              style: TextStyle(color: subtle, fontSize: 13),
            ),
          ),
        MediaUploadProgressOverlay(
          phase: _mediaPhase,
          progress: _uploadProgress,
          sentBytes: _uploadSentBytes,
          totalBytes: _uploadTotalBytes,
          borderRadius: BorderRadius.circular(14),
          onRetry: _mediaPhase == MediaUploadPhase.failed ? _retryMedia : null,
          child: FamilyMediaView(
            media: _mediaRef ??
                FamilyMediaRef(
                  id: 0,
                  type: _type == 'voice' ? 'voice' : _type,
                  status: 'uploading',
                  originalFilename: null,
                ),
            height: _singleMediaPreviewHeight,
            localBytes: _localPreviewBytes,
            localUrl: _localPreviewUrl,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: (_mediaBusy || _saving)
                ? null
                : () async {
                    await _clearLocalPreview();
                    if (mounted) {
                      setState(() {
                        _mediaRef = null;
                        _mediaPhase = MediaUploadPhase.idle;
                        _uploadProgress = 0;
                        _uploadSentBytes = 0;
                        _uploadTotalBytes = 0;
                      });
                    }
                  },
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 18),
            label: const Text('حذف رسانه', style: TextStyle(color: AppColors.error)),
          ),
        ),
      ],
    );
  }

  Future<void> _prepareLocalPreview(Uint8List bytes, String filename, String mediaType) async {
    await _clearLocalPreview();
    _localPreviewBytes = bytes;
    if (mediaType == 'image') return;
    try {
      _localPreviewUrl = await createLocalMediaUrl(
        bytes,
        guessMediaMimeType(filename, mediaType),
        extension: extensionOfFilename(filename),
      );
    } catch (_) {
      _localPreviewUrl = null;
    }
  }

  bool get _isArchived => _post?.isArchived ?? false;

  String get _audiencePreviewLabel {
    if (_audienceMode == 'all') return 'همه خانواده‌ها';
    final knownNames = _post?.targetFamilies
            .where((target) => _selectedFamilyIds.contains(target.familyId))
            .map((target) => target.familyName)
            .whereType<String>()
            .where((name) => name.isNotEmpty)
            .toList() ??
        [];
    if (_audienceMode == 'include') {
      if (knownNames.isNotEmpty) return knownNames.join('، ');
      if (_selectedFamilyIds.isEmpty) return 'خانواده‌های انتخابی';
      return '${_selectedFamilyIds.length} خانواده انتخابی';
    }
    if (knownNames.isNotEmpty) return 'همه به‌جز ${knownNames.join('، ')}';
    if (_selectedFamilyIds.isEmpty) return 'همه به‌جز…';
    return 'همه به‌جز ${_selectedFamilyIds.length} خانواده';
  }

  String get _blockTypeForPostType => switch (_type) {
        'voice' => 'audio',
        'video' => 'video',
        'image' || 'image_album' => 'image',
        _ => 'text',
      };

  Future<void> _refreshPendingMedia() async {
    if (_isImagePost) {
      try {
        final manager = context.read<AppState>().manager;
        for (var i = 0; i < _images.length; i++) {
          final media = _images[i].media;
          if (media == null || media.isReady) continue;
          setState(() {
            _images[i].phase = MediaUploadPhase.processing;
            _images[i].progress = 0.96;
          });
          final ready = await manager.waitForMediaReady(
            media.id,
            onUpdate: (updated) {
              if (!mounted) return;
              setState(() => _images[i].media = updated);
            },
            onUploadState: (upload) {
              if (!mounted) return;
              setState(() {
                _images[i].applyUpload(upload);
              });
            },
          );
          if (mounted) {
            setState(() {
              _images[i].media = ready;
              _images[i].phase = MediaUploadPhase.ready;
              _images[i].progress = 1;
            });
          }
        }
      } catch (e) {
        if (mounted) {
          showAppSnackBar(context, messageOf(e));
          for (var i = 0; i < _images.length; i++) {
            if (_images[i].media != null && !_images[i].media!.isReady) {
              _images[i].phase = MediaUploadPhase.failed;
            }
          }
        }
      }
      return;
    }

    final media = _mediaRef;
    if (media == null || media.isReady) return;
    setState(() {
      _mediaPhase = MediaUploadPhase.processing;
      _uploadProgress = 0.96;
    });
    try {
      final ready = await context.read<AppState>().manager.waitForMediaReady(
            media.id,
            onUpdate: (updated) {
              if (!mounted) return;
              setState(() => _mediaRef = updated);
            },
            onUploadState: (upload) {
              if (!mounted) return;
              setState(() => _applyMainUploadState(upload));
            },
          );
      if (mounted) {
        setState(() {
          _mediaRef = ready;
          _mediaPhase = MediaUploadPhase.ready;
          _uploadProgress = 1;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _mediaPhase = MediaUploadPhase.failed);
        showAppSnackBar(context, messageOf(e));
      }
    }
  }

  Future<void> _uploadMediaBytes(Uint8List bytes, String filename) async {
    if (_rejectOversizeMedia(bytes.length)) return;

    if (_isImagePost) {
      await _uploadImageBytes(bytes, filename);
      return;
    }

    final totalBytes = bytes.length;
    if (!mounted) return;
    setState(() {
      _mediaPhase = MediaUploadPhase.uploading;
      _uploadProgress = 0;
      _uploadSentBytes = 0;
      _uploadTotalBytes = totalBytes;
    });

    try {
      await _prepareLocalPreview(bytes, filename, _type);
      if (!mounted) return;

      final manager = context.read<AppState>().manager;
      final media = await manager.uploadMedia(
            bytes: bytes,
            filename: filename,
            type: _type,
            optimizeImages: null,
            onUploadState: (upload) {
              if (!mounted) return;
              setState(() => _applyMainUploadState(upload));
            },
          );
      if (!mounted) return;
      setState(() {
        _mediaRef = media;
        if (media.isReady) {
          _mediaPhase = MediaUploadPhase.ready;
          _uploadProgress = 1;
          _uploadSentBytes = totalBytes;
          _uploadTotalBytes = totalBytes;
        } else {
          _mediaPhase = MediaUploadPhase.processing;
          _uploadProgress = 1;
          _uploadSentBytes = totalBytes;
          _uploadTotalBytes = totalBytes;
        }
      });
      if (media.isReady) return;

      final ready = await manager.waitForMediaReady(
        media.id,
        totalBytes: totalBytes,
        onUpdate: (updated) {
          if (!mounted) return;
          setState(() => _mediaRef = updated);
        },
        onUploadState: (upload) {
          if (!mounted) return;
          setState(() => _applyMainUploadState(upload));
        },
      );
      if (mounted) {
        setState(() {
          _mediaRef = ready;
          _mediaPhase = MediaUploadPhase.ready;
          _uploadProgress = 1;
          _uploadSentBytes = totalBytes;
          _uploadTotalBytes = totalBytes;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _mediaPhase = MediaUploadPhase.failed);
        showAppSnackBar(context, messageOf(e));
      }
    }
  }

  Future<void> _uploadImageBytes(Uint8List bytes, String filename) async {
    if (_rejectOversizeMedia(bytes.length)) return;

    final draft = _AttachedImage(localBytes: bytes);
    draft.phase = MediaUploadPhase.uploading;
    setState(() {
      _images.add(draft);
    });

    try {
      final manager = context.read<AppState>().manager;
      final media = await manager.uploadMedia(
            bytes: bytes,
            filename: filename,
            type: 'image',
            optimizeImages: _optimizeImages,
            onUploadState: (upload) {
              if (!mounted) return;
              setState(() => draft.applyUpload(upload));
            },
          );
      if (!mounted) return;
      setState(() {
        draft.media = media;
        if (media.isReady) {
          draft.phase = MediaUploadPhase.ready;
          draft.progress = 1;
        } else {
          draft.phase = MediaUploadPhase.processing;
          draft.progress = 0.96;
        }
      });
      if (media.isReady) return;

      final ready = await manager.waitForMediaReady(
        media.id,
        onUpdate: (updated) {
          if (!mounted) return;
          setState(() => draft.media = updated);
        },
        onUploadState: (upload) {
          if (!mounted) return;
          setState(() => draft.applyUpload(upload));
        },
      );
      if (mounted) {
        setState(() {
          draft.media = ready;
          draft.phase = MediaUploadPhase.ready;
          draft.progress = 1;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          draft.phase = MediaUploadPhase.failed;
        });
        showAppSnackBar(context, messageOf(e));
      }
    }
  }

  Future<void> _uploadVoiceBytes(Uint8List bytes, String filename) {
    return _uploadMediaBytes(bytes, filename);
  }

  Future<void> _pickAndUploadMedia() async {
    if (_isImagePost) {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: true,
        withData: true,
      );
      final files = result?.files ?? const <PlatformFile>[];
      if (files.isEmpty) return;

      for (final picked in files) {
        final size = picked.size;
        if (size > 0 && _rejectOversizeMedia(size)) continue;
        final bytes = picked.bytes;
        if (bytes == null) {
          if (mounted) showAppSnackBar(context, 'خواندن فایل «${picked.name}» ناموفق بود.');
          continue;
        }
        if (_rejectOversizeMedia(bytes.length)) continue;
        await _uploadImageBytes(bytes, picked.name);
        if (!mounted) return;
      }
      return;
    }

    final fileType = switch (_type) {
      'voice' => FileType.audio,
      'video' => FileType.video,
      _ => FileType.any,
    };

    final result = await FilePicker.platform.pickFiles(type: fileType, withData: true);
    final picked = result?.files.singleOrNull;
    if (picked == null) return;

    final size = picked.size;
    if (size > 0 && _rejectOversizeMedia(size)) return;

    final bytes = picked.bytes;
    if (bytes == null) {
      if (mounted) showAppSnackBar(context, 'خواندن فایل ناموفق بود.');
      return;
    }

    await _uploadMediaBytes(bytes, picked.name);
  }

  Future<FamilyMediaRef?> _ensureMediaReady() async {
    if (_type == 'text') return null;

    if (_isImagePost) {
      try {
        final manager = context.read<AppState>().manager;
        for (var i = 0; i < _images.length; i++) {
          final media = _images[i].media;
          if (media == null) continue;
          if (media.isReady) continue;
          setState(() {
            _images[i].phase = MediaUploadPhase.processing;
            _images[i].progress = 0.96;
          });
          final ready = await manager.waitForMediaReady(
            media.id,
            onUpdate: (updated) {
              if (!mounted) return;
              setState(() => _images[i].media = updated);
            },
            onUploadState: (upload) {
              if (!mounted) return;
              setState(() {
                _images[i].applyUpload(upload);
              });
            },
          );
          if (mounted) {
            setState(() {
              _images[i].media = ready;
              _images[i].phase = MediaUploadPhase.ready;
              _images[i].progress = 1;
            });
          }
        }
        return _images.map((e) => e.media).whereType<FamilyMediaRef>().firstOrNull;
      } catch (e) {
        rethrow;
      }
    }

    final media = _mediaRef;
    if (media == null) return null;
    if (media.isReady) return media;

    setState(() {
      _mediaPhase = MediaUploadPhase.processing;
      _uploadProgress = 0.96;
    });
    final ready = await context.read<AppState>().manager.waitForMediaReady(
          media.id,
          onUpdate: (updated) {
            if (!mounted) return;
            setState(() => _mediaRef = updated);
          },
          onUploadState: (upload) {
            if (!mounted) return;
            setState(() => _applyMainUploadState(upload));
          },
        );
    if (mounted) {
      setState(() {
        _mediaRef = ready;
        _mediaPhase = MediaUploadPhase.ready;
        _uploadProgress = 1;
      });
    }
    return ready;
  }

  Future<void> _retryMedia() async {
    final media = _mediaRef;
    if (media == null || media.id == 0) return;
    setState(() {
      _mediaPhase = MediaUploadPhase.processing;
      _uploadProgress = 0.96;
    });
    try {
      final manager = context.read<AppState>().manager;
      final retried = await manager.retryMedia(media.id);
      if (!mounted) return;
      setState(() => _mediaRef = retried);
      if (retried.isReady) {
        setState(() {
          _mediaPhase = MediaUploadPhase.ready;
          _uploadProgress = 1;
        });
        return;
      }
      final ready = await manager.waitForMediaReady(
        retried.id,
        onUpdate: (updated) {
          if (!mounted) return;
          setState(() => _mediaRef = updated);
        },
        onUploadState: (upload) {
          if (!mounted) return;
          setState(() => _applyMainUploadState(upload));
        },
      );
      if (mounted) {
        setState(() {
          _mediaRef = ready;
          _mediaPhase = MediaUploadPhase.ready;
          _uploadProgress = 1;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _mediaPhase = MediaUploadPhase.failed);
        showAppSnackBar(context, messageOf(e));
      }
    }
  }

  Future<void> _retryImageMedia(_AttachedImage image) async {
    final media = image.media;
    if (media == null || media.id == 0) return;
    setState(() {
      image.phase = MediaUploadPhase.processing;
      image.progress = 0.96;
    });
    try {
      final manager = context.read<AppState>().manager;
      final retried = await manager.retryMedia(media.id);
      if (!mounted) return;
      setState(() => image.media = retried);
      if (retried.isReady) {
        setState(() {
          image.phase = MediaUploadPhase.ready;
          image.progress = 1;
        });
        return;
      }
      final ready = await manager.waitForMediaReady(
        retried.id,
        onUpdate: (updated) {
          if (!mounted) return;
          setState(() => image.media = updated);
        },
        onUploadState: (upload) {
          if (!mounted) return;
          setState(() => image.applyUpload(upload));
        },
      );
      if (mounted) {
        setState(() {
          image.media = ready;
          image.phase = MediaUploadPhase.ready;
          image.progress = 1;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => image.phase = MediaUploadPhase.failed);
        showAppSnackBar(context, messageOf(e));
      }
    }
  }

  Map<String, dynamic> _buildPayload() {
    final blocks = <Map<String, dynamic>>[];

    if (_type == 'text') {
      blocks.add({'type': 'text', 'position': 0, 'text': _textCtrl.text.trim()});
    } else if (_isImagePost) {
      var position = 0;
      for (final image in _images) {
        final media = image.media;
        if (media == null) continue;
        blocks.add({'type': 'image', 'position': position++, 'media_id': media.id});
      }
      if (_textCtrl.text.trim().isNotEmpty) {
        blocks.add({'type': 'text', 'position': position, 'text': _textCtrl.text.trim()});
      }
    } else {
      if (_mediaRef != null) {
        blocks.add({'type': _blockTypeForPostType, 'position': 0, 'media_id': _mediaRef!.id});
      }
      if (_textCtrl.text.trim().isNotEmpty) {
        blocks.add({'type': 'text', 'position': 1, 'text': _textCtrl.text.trim()});
      }
    }

    final payload = <String, dynamic>{
      'type': _payloadType,
      'audience_mode': _audienceMode,
      'is_important': _isImportant,
      'comments_enabled': _commentsEnabled,
      'blocks': blocks,
      'family_ids': _audienceMode == 'all' ? <int>[] : _selectedFamilyIds.toList(),
    };

    if (_actionEnabled && _actionPromptCtrl.text.trim().isNotEmpty) {
      final action = <String, dynamic>{
        'type': _actionType,
        'prompt': _actionPromptCtrl.text.trim(),
      };

      if (choiceActionTypes.contains(_actionType)) {
        action['options'] = _optionControllers
            .where((c) => c.text.trim().isNotEmpty)
            .toList()
            .asMap()
            .entries
            .map((e) => {'label': e.value.text.trim(), 'position': e.key})
            .toList();
      }

      if (_actionType == 'scale') {
        final min = int.tryParse(_scaleMinCtrl.text);
        final max = int.tryParse(_scaleMaxCtrl.text);
        if (min != null || max != null) {
          action['config'] = {if (min != null) 'min': min, if (max != null) 'max': max};
        }
      }

      final minutes = int.tryParse(_followUpMinutesCtrl.text);
      if (minutes != null && minutes > 0) {
        action['follow_up_after_minutes'] = minutes;
        if (_followUpMessageCtrl.text.trim().isNotEmpty) {
          action['follow_up_message'] = _followUpMessageCtrl.text.trim();
        }
      }

      final days = int.tryParse(_actionDaysCtrl.text) ?? 7;
      action['active_until'] = DateTime.now().add(Duration(days: days)).toUtc().toIso8601String();
      action['is_active'] = true;

      payload['action'] = action;
    }

    return payload;
  }

  Future<void> _generateAiDraft() async {
    final topic = _aiTopicCtrl.text.trim().isNotEmpty ? _aiTopicCtrl.text.trim() : _textCtrl.text.trim();
    if (topic.isEmpty) {
      showAppSnackBar(context, 'موضوع یا متن اولیه را وارد کنید.');
      return;
    }
    setState(() => _aiLoading = true);
    try {
      final draft = await context.read<AppState>().manager.generatePostDraft(
            topic: topic,
            type: _type,
            tone: _aiTone,
          );
      final text = draft['text']?.toString() ?? '';
      final suggestions = (draft['suggestions'] as List?)
              ?.map((e) => e.toString().trim())
              .where((s) => s.isNotEmpty)
              .toList() ??
          <String>[];
      setState(() {
        if (text.isNotEmpty) _textCtrl.text = text;
        _aiSuggestions = suggestions;
      });
      if (mounted) {
        showAppSnackBar(
          context,
          suggestions.isEmpty ? 'پیش‌نویس AI آماده شد.' : 'پیش‌نویس + ${toFaDigits(suggestions.length.toString())} پیشنهاد آماده شد.',
        );
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _save() async {
    if (_type == 'text' && _textCtrl.text.trim().isEmpty) {
      showAppSnackBar(context, 'متن پست را وارد کنید.');
      return;
    }
    if (_type != 'text' && !_hasRequiredMedia) {
      showAppSnackBar(context, 'ابتدا رسانه را آپلود کنید.');
      return;
    }

    setState(() => _saving = true);
    try {
      if (_type != 'text') {
        await _ensureMediaReady();
      }
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = _post == null ? await manager.createPost(payload) : await manager.updatePost(_post!.id, payload);
      setState(() => _post = saved);
      showAppSnackBar(context, _isArchived ? 'تغییرات آرشیو ذخیره شد.' : (_post!.isPublished ? 'تغییرات ذخیره شد.' : 'پیش‌نویس ذخیره شد.'));
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _publishNow() async {
    if (_type == 'text' && _textCtrl.text.trim().isEmpty) {
      showAppSnackBar(context, 'متن پست را وارد کنید.');
      return;
    }
    if (_type != 'text' && !_hasRequiredMedia) {
      showAppSnackBar(context, 'ابتدا رسانه را آپلود کنید.');
      return;
    }

    setState(() => _saving = true);
    try {
      if (_type != 'text') {
        await _ensureMediaReady();
      }
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = _post == null ? await manager.createPost(payload) : await manager.updatePost(_post!.id, payload);
      if (!mounted) return;
      setState(() => _post = saved);
      if (saved.isDraft) {
        await manager.publishPost(saved.id);
      }
      if (!mounted) return;
      showAppSnackBar(context, 'پست منتشر شد.');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _schedulePublish() async {
    if (_type == 'text' && _textCtrl.text.trim().isEmpty) {
      showAppSnackBar(context, 'متن پست را وارد کنید.');
      return;
    }
    if (_type != 'text' && !_hasRequiredMedia) {
      showAppSnackBar(context, 'ابتدا رسانه را آپلود کنید.');
      return;
    }

    final scheduled = await showPostScheduleSheet(context);
    if (scheduled == null || !mounted) return;

    setState(() => _saving = true);
    try {
      if (_type != 'text') {
        await _ensureMediaReady();
      }
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = _post == null ? await manager.createPost(payload) : await manager.updatePost(_post!.id, payload);
      if (!mounted) return;
      setState(() => _post = saved);
      await manager.schedulePost(saved.id, scheduled);
      if (!mounted) return;
      showAppSnackBar(context, 'پست برای ${formatJalaliDateTime(scheduled.toUtc().toIso8601String())} زمان‌بندی شد.');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _unschedulePublish() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      final updated = await context.read<AppState>().manager.unschedulePost(_post!.id);
      if (!mounted) return;
      setState(() => _post = updated);
      showAppSnackBar(context, 'زمان‌بندی انتشار لغو شد.');
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _republish() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = await manager.updatePost(_post!.id, payload);
      if (mounted) setState(() => _post = saved);
      await manager.publishPost(_post!.id);
      showAppSnackBar(context, 'پست دوباره منتشر شد و به بالای فید رفت.');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _archive() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.archivePost(_post!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _recover() async {
    if (_post == null) return;
    final wasPublished = _post!.publishedAt != null;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'بازیابی از آرشیو',
      content: Text(
        wasPublished
            ? 'این پست دوباره منتشر می‌شود و در فید خانواده نمایش داده می‌شود.'
            : 'این پست به پیش‌نویس‌ها برمی‌گردد.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('بازیابی')),
      ],
    );
    if (confirmed != true) return;

    setState(() => _saving = true);
    try {
      final recovered = await context.read<AppState>().manager.recoverPost(_post!.id);
      if (mounted) {
        showAppSnackBar(
          context,
          recovered.isPublished ? 'پست بازیابی و دوباره منتشر شد.' : 'پست به پیش‌نویس‌ها برگشت.',
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _togglePin() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      final updated = _post!.isPinned
          ? await context.read<AppState>().manager.unpinPost(_post!.id)
          : await context.read<AppState>().manager.pinPost(_post!.id);
      if (mounted) {
        setState(() => _post = updated);
        showAppSnackBar(context, updated.isPinned ? 'پست سنجاق شد.' : 'سنجاق برداشته شد.');
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    if (_post == null) return;
    final isPublished = _post!.isPublished;
    final isArchived = _isArchived;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: isArchived
          ? 'حذف پست آرشیوشده'
          : (isPublished ? 'حذف پست منتشرشده' : 'حذف پیش‌نویس'),
      content: Text(
        isArchived
            ? 'این پست آرشیوشده برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.'
            : (isPublished
                ? 'این پست از فید خانواده حذف می‌شود. این عمل قابل بازگشت نیست.'
                : 'این پیش‌نویس برای همیشه حذف می‌شود.'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          style: TextButton.styleFrom(foregroundColor: AppColors.error),
          child: const Text('حذف'),
        ),
      ],
    );
    if (confirmed != true) return;

    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.deletePost(_post!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickFamilies() async {
    final result = await showFamilyPickerSheet(context, _selectedFamilyIds);
    if (result != null) {
      setState(() {
        _selectedFamilyIds
          ..clear()
          ..addAll(result);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final muted = context.appTextMuted;
    final subtle = context.appTextSubtle;

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: Text(
          _post == null
              ? 'پست جدید'
              : (_isArchived
                  ? 'ویرایش پست آرشیوشده'
                  : (_post!.isPublished ? 'ویرایش پست منتشرشده' : 'ویرایش پست')),
        ),
      ),
      bottomNavigationBar: PostEditorActionBar(
        post: _post,
        saving: _saving,
        onSave: _save,
        onPublish: (_post == null || _post!.isDraft) ? _publishNow : null,
        onSchedule: (_post == null || _post!.isDraft) ? _schedulePublish : null,
        onRepublish: _post != null && (_post!.isPublished || _isArchived) ? _republish : null,
        onDelete: _post != null ? _delete : null,
        onArchive: _post != null && _post!.isPublished ? _archive : null,
        onRecover: _isArchived ? _recover : null,
        onTogglePin: _post != null && _post!.isPublished ? _togglePin : null,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: ListView(
            padding: AppBreakpoints.pagePadding(context).copyWith(bottom: 120),
            children: [
          if (_post == null)
            PanelGradientCard(
              variant: PanelGradientVariant.teal,
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 28),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      'پست جدید برای خانواده',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          if (_post == null) const SizedBox(height: AppSpacing.lg),
          if (_isArchived)
            GlassPanel(
              borderRadius: 16,
              blur: 0,
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  const Icon(Icons.archive_rounded, color: AppColors.warning),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      'این پست آرشیوشده است. می‌توانید ویرایش کنید، دوباره منتشر کنید، یا بدون انتشار مجدد بازیابی کنید.',
                      style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.85)),
                    ),
                  ),
                ],
              ),
            ),
          if (_isArchived) const SizedBox(height: AppSpacing.lg),
          if (_post?.isScheduled == true)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.lg),
              child: GlassPanel(
                borderRadius: 16,
                blur: 0,
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded, color: AppColors.gold),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        'زمان‌بندی شده برای ${formatJalaliDateTime(_post!.scheduledPublishAt)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurface,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _saving ? null : _unschedulePublish,
                      child: const Text('لغو'),
                    ),
                  ],
                ),
              ),
            ),
          PanelSectionCard(
            title: 'نوشتن پیام',
            icon: Icons.edit_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_post == null) ...[
                  PostTypeSelector(
                    selected: _selectorType,
                    enabled: !_mediaBusy && !_saving,
                    onChanged: (t) => _changePostType(t),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                Container(
                  decoration: BoxDecoration(
                    color: context.appSurfaceSoft,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.appBorder),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                  child: TextField(
                    controller: _textCtrl,
                    maxLines: 10,
                    minLines: 5,
                    style: TextStyle(color: scheme.onSurface),
                    decoration: InputDecoration(
                      hintText: _type == 'text' ? 'پیام خود را بنویسید…' : 'کپشن (اختیاری)',
                      hintStyle: TextStyle(color: subtle),
                      border: InputBorder.none,
                      isDense: true,
                    ),
                  ),
                ),
                if (_type != 'text') ...[
                  const SizedBox(height: AppSpacing.md),
                  if (_isImagePost)
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('بهینه‌سازی تصویر', style: TextStyle(color: scheme.onSurface)),
                      subtitle: Text(
                        'قبل از آپلود، حجم تصویر با سرویس‌های بهینه‌سازی کم می‌شود',
                        style: TextStyle(color: subtle, fontSize: 12),
                      ),
                      value: _optimizeImages,
                      onChanged: (_mediaBusy || _saving)
                          ? null
                          : (value) => setState(() => _optimizeImages = value),
                    ),
                  if (_isImagePost) const SizedBox(height: AppSpacing.sm),
                  if (_isImagePost)
                    _buildImageAttachments(scheme: scheme, subtle: subtle)
                  else if (_showsSingleMediaSection)
                    _buildSingleMediaUploadPreview(subtle: subtle)
                  else if (_type == 'voice')
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        VoiceRecorderPanel(
                          enabled: !_saving,
                          onRecorded: (result) => _uploadVoiceBytes(
                            result.bytes,
                            result.filename,
                          ),
                          onError: (message) => showAppSnackBar(context, message),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Align(
                          alignment: Alignment.center,
                          child: TextButton.icon(
                            onPressed: _saving ? null : _pickAndUploadMedia,
                            icon: Icon(Icons.audio_file_outlined, size: 18, color: scheme.primary),
                            label: Text(
                              'انتخاب از فایل',
                              style: TextStyle(color: scheme.primary),
                            ),
                          ),
                        ),
                      ],
                    )
                  else
                    UploadZone(
                      label: 'انتخاب ${labelOf(mediaTypeLabels, _type)}',
                      uploading: false,
                      progress: _uploadProgress,
                      sentBytes: _uploadSentBytes,
                      totalBytes: _uploadTotalBytes,
                      phase: _mediaPhase,
                      enabled: !_saving && !_mediaBusy,
                      onTap: _pickAndUploadMedia,
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'مخاطب و اولویت',
            icon: Icons.groups_rounded,
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  value: _audienceMode,
                  items: audienceModeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: (v) => setState(() => _audienceMode = v ?? 'all'),
                ),
                const SizedBox(height: AppSpacing.sm),
                Align(
                  alignment: Alignment.centerRight,
                  child: StatusChip(
                    label: _audiencePreviewLabel,
                    color: AppColors.accent,
                    icon: Icons.campaign_rounded,
                  ),
                ),
                if (_audienceMode != 'all') ...[
                  const SizedBox(height: AppSpacing.md),
                  SecondaryButton(
                    label: 'انتخاب خانواده‌ها (${toFaDigits(_selectedFamilyIds.length.toString())})',
                    icon: Icons.groups_rounded,
                    onPressed: _pickFamilies,
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('نظرات فعال'),
                  subtitle: const Text('می‌توانید برای هر پست نظردهی را ببندید'),
                  value: _commentsEnabled,
                  onChanged: (v) => setState(() => _commentsEnabled = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Row(
                    children: [
                      Icon(Icons.star_rounded, size: 20, color: AppColors.gold),
                      SizedBox(width: AppSpacing.sm),
                      Text('پست مهم (اعلان فوری)'),
                    ],
                  ),
                  value: _isImportant,
                  onChanged: (v) => setState(() => _isImportant = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'دستیار AI',
            icon: Icons.auto_awesome_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'موضوع را بنویسید؛ AI پیش‌نویس حرفه‌ای و پیشنهادهای ویرایش می‌دهد.',
                  style: TextStyle(color: muted, fontSize: 13),
                ),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _aiTopicCtrl,
                  decoration: const InputDecoration(
                    labelText: 'موضوع پست',
                    hintText: 'مثلاً: انگیزه برای شروع هفته، مدیریت استرس',
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text('لحن نوشتار', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: scheme.onSurface)),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: _aiToneOptions.map((tone) {
                    final selected = _aiTone == tone;
                    return FilterChip(
                      label: Text(tone, style: const TextStyle(fontSize: 12)),
                      selected: selected,
                      onSelected: (_) => setState(() => _aiTone = tone),
                      showCheckmark: false,
                      selectedColor: context.appPrimarySoft,
                      backgroundColor: scheme.surface.withValues(alpha: 0.45),
                      side: BorderSide(color: context.appBorder),
                      labelStyle: TextStyle(
                        color: selected ? scheme.primary : muted,
                        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: AppSpacing.md),
                PrimaryButton(
                  label: 'تولید پیش‌نویس',
                  icon: Icons.auto_awesome_rounded,
                  loading: _aiLoading,
                  onPressed: (_aiLoading || _saving) ? null : _generateAiDraft,
                ),
                if (_aiSuggestions.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text('پیشنهادهای ویرایش', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: scheme.onSurface)),
                  const SizedBox(height: AppSpacing.sm),
                  ..._aiSuggestions.map(
                    (tip) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                      child: InkWell(
                        onTap: () => setState(() => _textCtrl.text = '${_textCtrl.text.trim()}\n\n$tip'.trim()),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: context.appAccentSoft,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: context.appBorder),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.lightbulb_outline_rounded, size: 16, color: scheme.primary),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(child: Text(tip, style: TextStyle(fontSize: 13, color: scheme.onSurface))),
                              Icon(Icons.add_rounded, size: 16, color: muted),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'اکشن تعاملی',
            icon: Icons.ads_click_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('افزودن اکشن تعاملی'),
                  value: _actionEnabled,
                  onChanged: (v) => setState(() => _actionEnabled = v),
                ),
                if (_actionEnabled) ..._buildActionFields(),
              ],
            ),
          ),
          if (_post != null && (_post!.isPublished || _post!.isArchived) && _post!.actions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            PostActionResultsPanel(postId: _post!.id),
          ],
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildActionFields() {
    return [
      const SizedBox(height: AppSpacing.md),
      DropdownButtonFormField<String>(
        value: _actionType,
        decoration: const InputDecoration(labelText: 'نوع اکشن'),
        items: actionTypeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
        onChanged: (v) => setState(() => _actionType = v ?? 'commitment'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _actionPromptCtrl,
        decoration: const InputDecoration(labelText: 'متن سؤال/درخواست'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _actionDaysCtrl,
        decoration: const InputDecoration(
          labelText: 'مدت فعال بودن (روز)',
          helperText: 'پس از این مدت نظرسنجی/تعهد بسته می‌شود (پیش‌فرض ۷ روز)',
        ),
        keyboardType: TextInputType.number,
      ),
      if (choiceActionTypes.contains(_actionType)) ...[
        const SizedBox(height: AppSpacing.md),
        Text('گزینه‌ها', style: TextStyle(color: context.appTextMuted)),
        ..._optionControllers.asMap().entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(top: AppSpacing.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: entry.value,
                        decoration: InputDecoration(labelText: 'گزینه ${toFaDigits((entry.key + 1).toString())}', isDense: true),
                      ),
                    ),
                    if (_optionControllers.length > 2)
                      IconButton(
                        onPressed: () => setState(() => _optionControllers.removeAt(entry.key)),
                        icon: const Icon(Icons.remove_circle_outline_rounded),
                      ),
                  ],
                ),
              ),
            ),
        TextButton.icon(
            onPressed: () => setState(() => _optionControllers.add(TextEditingController())),
            icon: const Icon(Icons.add_rounded),
            label: const Text('افزودن گزینه'),
          ),
      ],
      if (_actionType == 'scale') ...[
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _scaleMinCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداقل (پیش‌فرض ۱)'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: TextField(
                controller: _scaleMaxCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداکثر (پیش‌فرض ۱۰)'),
              ),
            ),
          ],
        ),
      ],
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _followUpMinutesCtrl,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'پیگیری بعد از (دقیقه) — اختیاری'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _followUpMessageCtrl,
        decoration: const InputDecoration(labelText: 'پیام پیگیری — اختیاری'),
      ),
    ];
  }

  Widget _buildImageAttachments({
    required ColorScheme scheme,
    required Color subtle,
  }) {
    if (_images.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          UploadZone(
            label: 'انتخاب عکس‌ها',
            uploading: false,
            progress: 0,
            enabled: !_saving && !_mediaBusy,
            onTap: _pickAndUploadMedia,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'می‌توانید چند عکس را با هم انتخاب کنید (آلبوم)',
            textAlign: TextAlign.center,
            style: TextStyle(color: subtle, fontSize: 12),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            for (var i = 0; i < _images.length; i++)
              _ImageThumb(
                image: _images[i],
                enabled: !_mediaBusy && !_saving,
                onRemove: () => setState(() => _images.removeAt(i)),
                onRetry: () => _retryImageMedia(_images[i]),
              ),
            if (!_mediaBusy && !_saving)
              InkWell(
                onTap: _pickAndUploadMedia,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: 104,
                  height: 104,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: context.appBorder),
                    color: context.appSurfaceSoft,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_photo_alternate_outlined, color: scheme.primary),
                      const SizedBox(height: 4),
                      Text(
                        'افزودن',
                        style: TextStyle(color: scheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          _images.length >= 2
              ? 'آلبوم ${toFaDigits(_images.length.toString())} عکسی'
              : 'یک عکس انتخاب شده — برای آلبوم عکس‌های بیشتری اضافه کنید',
          style: TextStyle(color: subtle, fontSize: 12),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: (_mediaBusy || _saving)
                ? null
                : () => setState(() => _images.clear()),
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 18),
            label: const Text('حذف همه عکس‌ها', style: TextStyle(color: AppColors.error)),
          ),
        ),
      ],
    );
  }
}

class _AttachedImage {
  _AttachedImage({this.media, this.localBytes});

  FamilyMediaRef? media;
  Uint8List? localBytes;
  MediaUploadPhase phase = MediaUploadPhase.idle;
  double progress = 0;
  int sentBytes = 0;
  int totalBytes = 0;

  void applyUpload(UploadProgress upload) {
    phase = upload.phase;
    progress = upload.fraction;
    sentBytes = upload.sentBytes;
    totalBytes = upload.totalBytes;
  }
}

class _ImageThumb extends StatelessWidget {
  const _ImageThumb({
    required this.image,
    required this.onRemove,
    required this.enabled,
    this.onRetry,
  });

  final _AttachedImage image;
  final VoidCallback onRemove;
  final bool enabled;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final media = image.media ??
        FamilyMediaRef(
          id: 0,
          type: 'image',
          status: 'uploading',
          originalFilename: null,
        );
    final phase = image.media?.isReady == true
        ? MediaUploadPhase.ready
        : image.phase;

    return SizedBox(
      width: 104,
      height: 104,
      child: Stack(
        fit: StackFit.expand,
        children: [
          MediaUploadProgressOverlay(
            phase: phase,
            progress: image.progress,
            sentBytes: image.sentBytes,
            totalBytes: image.totalBytes,
            borderRadius: BorderRadius.circular(14),
            onRetry: phase == MediaUploadPhase.failed ? onRetry : null,
            child: FamilyMediaView(
              media: media,
              height: 104,
              previewOnly: true,
              localBytes: image.localBytes,
            ),
          ),
          PositionedDirectional(
            top: 4,
            end: 4,
            child: Material(
              color: Colors.black54,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: enabled ? onRemove : null,
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(Icons.close_rounded, size: 16, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
