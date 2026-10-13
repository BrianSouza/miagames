import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/audio/narrator.dart';
import '../core/bridge/game_message.dart';
import '../core/theme/app_colors.dart';
import '../core/widgets/exit_guard.dart';
import '../modules/game_module.dart';

/// Carrega um mini-jogo (HTML/JS em assets/) numa WebView e faz a ponte
/// entre ele e o Flutter: configuração inicial, voz e navegação.
class GameScreen extends StatefulWidget {
  final GameModule game;
  final GameDifficulty difficulty;
  final Narrator narrator;

  const GameScreen({
    super.key,
    required this.game,
    required this.difficulty,
    required this.narrator,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
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
        onMessageReceived: (message) => _onGameMessage(message.message),
      )
      ..loadFlutterAsset(widget.game.assetPath);
  }

  void _sendInitConfig() {
    final config = jsonEncode({
      'type': 'INIT',
      'difficulty': widget.difficulty.name,
      'gameId': widget.game.id,
    });
    _controller.runJavaScript('window.handleFlutterMessage($config)');
  }

  void _onGameMessage(String raw) {
    switch (GameMessage.parse(raw)) {
      case NavigateBack():
        // Navigator.pop não passa pelo ExitGuard: o jogo já exigiu segurar o botão
        if (mounted) Navigator.pop(context);
      case Speak(:final text):
        widget.narrator.speak(text);
      case GameComplete():
        // Futuro: salvar estrelas e progresso, analytics
        break;
      case null:
        break;
    }
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
