import 'package:flutter/material.dart';

class AppTheme {
  static final clinicalLightTheme = ThemeData(
    useMaterial3: true,
    primaryColor: const Color(0xFF8FB9A8),
    scaffoldBackgroundColor: const Color(0xFFF5F7F8),
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF8FB9A8),
      secondary: Color(0xFF727077),
      outlineVariant: Color(0xFFF1D3B3),
    ),
  );

  static final clinicalDarkTheme = ThemeData(
    useMaterial3: true,
    primaryColor: const Color(0xFF8FB9A8),
    scaffoldBackgroundColor: const Color(0xFF121416),
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFFA8D0C0),
      secondary: Color(0xFFA0A0A0),
      outlineVariant: Color(0xFFEDC295),
    ),
  );

  static final colorfulTheme = ThemeData(
    useMaterial3: true,
    primaryColor: const Color(0xFF6C63FF), // Vibrant Purple
    scaffoldBackgroundColor: const Color(0xFFF3F4F6),
    colorScheme: const ColorScheme.light(
      primary: Color(0xFF6C63FF),
      secondary: Color(0xFF00BFA5), // Teal Accent
      tertiary: Color(0xFFFF6584), // Pink/Red Accent
      surface: Colors.white,
      outlineVariant: Color(0xFFFFD740), // Amber
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      iconTheme: IconThemeData(color: Colors.black87),
      titleTextStyle: TextStyle(
          color: Colors.black87, fontSize: 20, fontWeight: FontWeight.bold),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: Color(0xFF6C63FF),
      foregroundColor: Colors.white,
    ),
  );
}
