import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/audio/narrator.dart';
import '../core/bridge/game_session.dart';
import '../core/storage/progress_store.dart';
import '../core/theme/app_colors.dart';
import '../core/widgets/exit_guard.dart';
import '../modules/game_module.dart';

/// Carrega um mini-jogo (HTML/JS em assets/) numa WebView e faz a ponte
/// entre ele e o Flutter: configuração inicial, voz, navegação e progresso.
class GameScreen extends StatefulWidget {
  final GameModule game;
  final GameDifficulty difficulty;
  final Narrator narrator;
  final ProgressStore store;

  const GameScreen({
    super.key,
    required this.game,
    required this.difficulty,
    required this.narrator,
    required this.store,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final WebViewController _controller;
  late final GameSession _session;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _session = GameSession(
      game: widget.game,
      difficulty: widget.difficulty,
      narrator: widget.narrator,
      store: widget.store,
      // Navigator.pop não passa pelo ExitGuard: o jogo já exigiu segurar o botão
      onNavigateBack: () {
        if (mounted) Navigator.pop(context);
      },
    );
    _buildController();
  }

  @override
  void dispose() {
    widget.narrator.stop();
    super.dispose();
  }

  void _buildController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          // O jogo é local: nenhuma navegação para fora dos assets do app
          onNavigationRequest: (request) =>
              Uri.tryParse(request.url)?.scheme == 'file'
              ? NavigationDecision.navigate
              : NavigationDecision.prevent,
          onPageFinished: (_) {
            _sendInitConfig();
            if (mounted) setState(() => _isLoading = false);
          },
        ),
      )
      ..addJavaScriptChannel(
        'MiaGamesFlutter',
        onMessageReceived: (message) => _session.handle(message.message),
      )
      ..loadFlutterAsset(widget.game.assetPath);
  }

  void _sendInitConfig() {
    final config = jsonEncode(_session.initMessage());
    _controller.runJavaScript('window.handleFlutterMessage($config)');
  }

  @override
  Widget build(BuildContext context) {
    return ExitGuard(
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_isLoading) const Center(child: CircularProgressIndicator()),
            ],
          ),
        ),
      ),
    );
  }
}
