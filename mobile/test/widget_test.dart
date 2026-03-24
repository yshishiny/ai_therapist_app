import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:ai_therapist_mobile/core/widgets/risk_badge.dart';

void main() {
  testWidgets('risk badge renders label', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RiskBadge(risk: RiskLevel.high),
        ),
      ),
    );

    expect(find.text('High'), findsOneWidget);
  });
}
