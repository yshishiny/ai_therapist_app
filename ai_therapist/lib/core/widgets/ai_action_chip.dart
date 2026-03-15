import 'package:flutter/material.dart';
import '../../app/theme.dart';

class AiActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool isLoading;

  const AiActionChip({
    super.key,
    required this.label,
    required this.icon,
    required this.onTap,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ActionChip(
      avatar: isLoading 
        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
        : const Icon(Icons.auto_awesome, color: ClinicalTheme.aiAccent, size: 16),
      label: Text(label),
      onPressed: isLoading ? null : onTap,
      backgroundColor: theme.colorScheme.surface,
      side: BorderSide(color: ClinicalTheme.aiAccent.withValues(alpha: 0.4)),
    );
  }
}
