import 'package:flutter/material.dart';
import '../../app/theme.dart';

enum RiskLevel { high, med, low }

class RiskBadge extends StatelessWidget {
  final RiskLevel risk;
  const RiskBadge({super.key, required this.risk});

  @override
  Widget build(BuildContext context) {
    final (color, icon, label) = switch (risk) {
      RiskLevel.high => (ClinicalTheme.riskHigh, Icons.warning_rounded, 'High'),
      RiskLevel.med => (ClinicalTheme.riskMed, Icons.info_rounded, 'Med'),
      RiskLevel.low => (ClinicalTheme.riskLow, Icons.check_circle_rounded, 'Low'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(label, style: Theme.of(context).textTheme.labelLarge?.copyWith(color: color)),
        ],
      ),
    );
  }
}
