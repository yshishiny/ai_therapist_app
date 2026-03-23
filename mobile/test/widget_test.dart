import 'package:flutter_test/flutter_test.dart';
import 'package:ai_therapist_mobile/src/app.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('renders scaffold text', (WidgetTester tester) async {
    await tester.pumpWidget(const AiTherapistApp());
    expect(find.text('AI Therapist mobile scaffold'), findsOneWidget);
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
