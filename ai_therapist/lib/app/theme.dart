import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ClinicalTheme {
  // Color Tokens
  static const Color primaryLight = Color(0xFF2C7A6A);
  static const Color primaryDark = Color(0xFF5BBFAA);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF1A1D1E);
  static const Color bgLight = Color(0xFFF4F7F8);
  static const Color bgDark = Color(0xFF121416);
  
  // Risk & Status Tokens
  static const Color riskHigh = Color(0xFFD32F2F);
  static const Color riskMed = Color(0xFFE65100);
  static const Color riskLow = Color(0xFF2E7D32);
  static const Color aiAccent = Color(0xFF6C63FF);

  static ThemeData getTheme(bool isDark) {
    final colorScheme = ColorScheme(
      brightness: isDark ? Brightness.dark : Brightness.light,
      primary: isDark ? primaryDark : primaryLight,
      onPrimary: Colors.white,
      primaryContainer: isDark ? const Color(0xFF1A4A42) : const Color(0xFFE0F2ED),
      secondary: isDark ? const Color(0xFFA0B4C8) : const Color(0xFF5C6A7A),
      onSecondary: Colors.white,
      surface: isDark ? surfaceDark : surfaceLight,
      onSurface: isDark ? Colors.white : const Color(0xFF1A1D1E),
      error: riskHigh,
      onError: Colors.white,
      outline: isDark ? Colors.white24 : Colors.black12,
    );

    final textTheme = GoogleFonts.outfitTextTheme().copyWith(
      displayLarge: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w700),
      headlineMedium: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w600),
      titleLarge: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600),
      bodyLarge: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w400, height: 1.6),
      bodyMedium: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w400, height: 1.5),
      labelLarge: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w500),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: colorScheme.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge?.copyWith(color: colorScheme.onSurface),
      ),
      cardTheme: CardThemeData(
        color: colorScheme.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: colorScheme.outline, width: 1),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        side: BorderSide(color: colorScheme.outline),
        labelStyle: textTheme.labelLarge,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorScheme.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
    );
  }
}

/// Convenience wrapper so main.dart can use [AppTheme.colorfulTheme] and
/// [AppTheme.clinicalDarkTheme] without knowing about [ClinicalTheme].
class AppTheme {
  AppTheme._();
  static ThemeData get colorfulTheme    => ClinicalTheme.getTheme(false);
  static ThemeData get clinicalDarkTheme => ClinicalTheme.getTheme(true);
}
