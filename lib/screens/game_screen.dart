import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../core/theme/app_colors.dart';
import '../modules/game_module.dart';

class GameScreen extends StatefulWidget {
  final GameModule game;
  final GameDifficulty difficulty;

  const GameScreen({
    super.key,
    required this.game,
    required this.difficulty,
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

  void _buildController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppColors.background)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) {
          _sendInitConfig();
          if (mounted) setState(() => _isLoading = false);
        },
      ))
      ..addJavaScriptChannel(
        'MiaGamesFlutter',
        onMessageReceived: _onGameMessage,
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

  void _onGameMessage(JavaScriptMessage message) {
    final data = jsonDecode(message.message) as Map<String, dynamic>;
    switch (data['type'] as String?) {
      case 'NAVIGATE_BACK':
        if (mounted) Navigator.pop(context);
      case 'GAME_COMPLETE':
        // Future: show native overlay, persist score, trigger analytics
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}
