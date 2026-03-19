class Assessment {
  final String id;
  final String title;
  final List<String> questions;
  final List<String> options;
  final String scoringGuide;

  Assessment({
    required this.id,
    required this.title,
    required this.questions,
    required this.options,
    this.scoringGuide = '',
  });
}
