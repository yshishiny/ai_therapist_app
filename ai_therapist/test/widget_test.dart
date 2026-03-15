import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ai_therapist/main.dart';
import 'package:ai_therapist/features/auth/auth_service.dart';

void main() {
  testWidgets('Dashboard loads correctly smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthService()),
        ],
        child: const AiTherapistApp(),
      ),
    );

    // Give it time to settle
    await tester.pumpAndSettle();

    // Verify that the dashboard loads the "Welcome" text
    expect(find.textContaining('Welcome, Dr.'), findsOneWidget);
    
    // Verify that the 'Active Cases' stat card is present
    expect(find.text('Active Cases'), findsOneWidget);
  });
}
