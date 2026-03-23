import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'test_screen.dart';
import 'assessment_data.dart';
import 'phq9_screen.dart';

class AssessmentListScreen extends StatefulWidget {
  const AssessmentListScreen({super.key});

  @override
  State<AssessmentListScreen> createState() => _AssessmentListScreenState();
}

class _AssessmentListScreenState extends State<AssessmentListScreen> {
  String _searchQuery = '';
  String? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    // Filter assessments
    final filteredAssessments = AssessmentData.allAssessments.where((a) {
      final matchesSearch =
          a.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              a.code.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory =
          _selectedCategory == null || a.category == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList();

    // Get unique categories
    final categories =
        AssessmentData.allAssessments.map((a) => a.category).toSet().toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Assessments Library', style: GoogleFonts.inter()),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SearchBar(
              hintText: 'Search assessments...',
              leading: const Icon(Icons.search, color: Colors.grey),
              elevation: WidgetStateProperty.all(0),
              backgroundColor: WidgetStateProperty.all(Colors.grey.shade100),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Category Filter
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildCategoryChip('All', _selectedCategory == null, () {
                  setState(() => _selectedCategory = null);
                }),
                ...categories.map((cat) => Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child:
                          _buildCategoryChip(cat, _selectedCategory == cat, () {
                        setState(() => _selectedCategory = cat);
                      }),
                    )),
              ],
            ),
          ),

          // Assessment List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filteredAssessments.length,
              itemBuilder: (context, index) {
                final assessment = filteredAssessments[index];
                return _buildAssessmentCard(context, assessment);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, bool isSelected, VoidCallback onTap) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onTap(),
      backgroundColor: Colors.white,
      selectedColor: const Color(0xFF8FB9A8).withOpacity(0.2),
      labelStyle: TextStyle(
        color: isSelected ? const Color(0xFF00695C) : Colors.black87,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? const Color(0xFF8FB9A8) : Colors.grey.shade300,
        ),
      ),
      showCheckmark: false,
    );
  }

  Widget _buildAssessmentCard(
      BuildContext context, ClinicalAssessment assessment) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () {
          if (assessment.id == 'phq9') {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const Phq9Screen(),
              ),
            );
          } else {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => AssessmentScreen(
                  assessmentId: assessment.id,
                  title: '${assessment.code} - ${assessment.title}',
                  questions: assessment.questions,
                  options: assessment.options,
                ),
              ),
            );
          }
        },
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: assessment.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: Text(
                  assessment.code,
                  style: GoogleFonts.inter(
                    color: assessment.color,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      assessment.title,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      assessment.subtitle,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        assessment.contentMeta,
                        style: TextStyle(
                          color: Colors.grey[800],
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
