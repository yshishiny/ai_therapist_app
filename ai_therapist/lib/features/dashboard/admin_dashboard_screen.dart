/// admin_dashboard_screen.dart
/// Admin-only screen for bulk data management:
///   - Upload resources (books, articles, handouts)
///   - Import contacts via CSV template
///   - Manage assessments and question banks
///
/// Accessible only to users with Role.admin (enforced by backend).

library;

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/api_client.dart';

// ─── Models ────────────────────────────────────────────────────────────────────

class ResourceItem {
  final String id;
  final String title;
  final String category;
  final String? author;
  final String createdAt;

  const ResourceItem({
    required this.id,
    required this.title,
    required this.category,
    this.author,
    required this.createdAt,
  });

  factory ResourceItem.fromApi(Map<String, dynamic> j) => ResourceItem(
        id: j['id'] as String,
        title: j['title'] as String,
        category: j['category'] as String? ?? 'BOOK',
        author: j['author'] as String?,
        createdAt: (j['created_at'] as String?) ?? '',
      );
}

class ContactItem {
  final String id;
  final String fullName;
  final String? email;
  final String? phone;
  final String role;

  const ContactItem({
    required this.id,
    required this.fullName,
    this.email,
    this.phone,
    required this.role,
  });

  factory ContactItem.fromApi(Map<String, dynamic> j) => ContactItem(
        id: j['id'] as String,
        fullName: j['full_name'] as String,
        email: j['email'] as String?,
        phone: j['phone'] as String?,
        role: j['role'] as String? ?? 'REFERRER',
      );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F8),
      appBar: AppBar(
        title: Text('Admin Dashboard', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF2D3250),
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tab,
          indicatorColor: const Color(0xFF8FB9A8),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: const [
            Tab(icon: Icon(Icons.library_books), text: 'Resources'),
            Tab(icon: Icon(Icons.contacts), text: 'Contacts'),
            Tab(icon: Icon(Icons.quiz), text: 'Assessments'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: const [
          _ResourcesTab(),
          _ContactsTab(),
          _AssessmentQuestionsTab(),
        ],
      ),
    );
  }
}

// ─── Tab 1: Resources (Books, Handouts, Articles) ─────────────────────────────

class _ResourcesTab extends StatefulWidget {
  const _ResourcesTab();

  @override
  State<_ResourcesTab> createState() => _ResourcesTabState();
}

class _ResourcesTabState extends State<_ResourcesTab> {
  List<ResourceItem> _items = [];
  bool _loading = true;
  String? _error;

  final _titleCtrl = TextEditingController();
  final _authorCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _category = 'BOOK';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await ApiClient.instance.get('/admin/resources');
      if (resp.statusCode == 200) {
        final raw = jsonDecode(resp.body) as List<dynamic>;
        setState(() {
          _items = raw.map((e) => ResourceItem.fromApi(e as Map<String, dynamic>)).toList();
        });
      }
    } catch (e) {
      setState(() => _error = 'Failed to load resources.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _addResource() async {
    if (_titleCtrl.text.trim().isEmpty) return;
    try {
      await ApiClient.instance.post('/admin/resources', body: {
        'title': _titleCtrl.text.trim(),
        'author': _authorCtrl.text.trim().isEmpty ? null : _authorCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'category': _category,
      });
      _titleCtrl.clear();
      _authorCtrl.clear();
      _descCtrl.clear();
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Resource added')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Add Form
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add Resource', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _titleCtrl,
                      decoration: _inputDecoration('Title *'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _authorCtrl,
                      decoration: _inputDecoration('Author'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _descCtrl,
                      decoration: _inputDecoration('Description'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                    value: _category,
                    items: ['BOOK', 'ARTICLE', 'HANDOUT', 'VIDEO', 'OTHER']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _category = v!),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: _addResource,
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8FB9A8),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        // CSV Upload hint
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF2D3250).withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF2D3250).withOpacity(0.15)),
          ),
          child: Row(
            children: [
              const Icon(Icons.upload_file, color: Color(0xFF2D3250)),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Bulk upload: POST /admin/resources/import with a CSV file.\n'
                  'Columns: title, author, category, description, file_url',
                  style: TextStyle(fontSize: 12, color: Color(0xFF2D3250)),
                ),
              ),
            ],
          ),
        ),
        // List
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
                  : _items.isEmpty
                      ? const Center(child: Text('No resources yet. Add one above.'))
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final r = _items[i];
                            return ListTile(
                              leading: _categoryIcon(r.category),
                              title: Text(r.title),
                              subtitle: Text(r.author ?? r.category),
                              trailing: Text(r.category,
                                  style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            );
                          },
                        ),
        ),
      ],
    );
  }

  Widget _categoryIcon(String cat) {
    final icons = {
      'BOOK': Icons.menu_book,
      'ARTICLE': Icons.article,
      'HANDOUT': Icons.description,
      'VIDEO': Icons.smart_display,
      'OTHER': Icons.attach_file,
    };
    return CircleAvatar(
      backgroundColor: const Color(0xFF8FB9A8).withOpacity(0.15),
      child: Icon(icons[cat] ?? Icons.attach_file, color: const Color(0xFF8FB9A8), size: 20),
    );
  }
}

// ─── Tab 2: Contacts ──────────────────────────────────────────────────────────

class _ContactsTab extends StatefulWidget {
  const _ContactsTab();

  @override
  State<_ContactsTab> createState() => _ContactsTabState();
}

class _ContactsTabState extends State<_ContactsTab> {
  List<ContactItem> _items = [];
  bool _loading = true;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _orgCtrl = TextEditingController();
  String _role = 'REFERRER';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final resp = await ApiClient.instance.get('/admin/contacts');
      if (resp.statusCode == 200) {
        final raw = jsonDecode(resp.body) as List<dynamic>;
        setState(() {
          _items = raw.map((e) => ContactItem.fromApi(e as Map<String, dynamic>)).toList();
        });
      }
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _addContact() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    try {
      await ApiClient.instance.post('/admin/contacts', body: {
        'full_name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        'organisation': _orgCtrl.text.trim().isEmpty ? null : _orgCtrl.text.trim(),
        'role': _role,
      });
      _nameCtrl.clear(); _emailCtrl.clear(); _phoneCtrl.clear(); _orgCtrl.clear();
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Add Contact', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
                  // CSV template download hint
                  TextButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('POST /admin/contacts/import with CSV:\nfull_name,email,phone,role,organisation')),
                      );
                    },
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('CSV Template'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: TextField(controller: _nameCtrl, decoration: _inputDecoration('Full Name *'))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: _emailCtrl, decoration: _inputDecoration('Email'), keyboardType: TextInputType.emailAddress)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: TextField(controller: _phoneCtrl, decoration: _inputDecoration('Phone'), keyboardType: TextInputType.phone)),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: _orgCtrl, decoration: _inputDecoration('Organisation'))),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                    value: _role,
                    items: ['REFERRER', 'GP', 'SPECIALIST', 'OTHER']
                        .map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13))))
                        .toList(),
                    onChanged: (v) => setState(() => _role = v!),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _addContact,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8FB9A8), foregroundColor: Colors.white),
                    child: const Text('Add'),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _items.isEmpty
                  ? const Center(child: Text('No contacts yet.'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _items.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final c = _items[i];
                        return ListTile(
                          leading: CircleAvatar(child: Text(c.fullName[0])),
                          title: Text(c.fullName),
                          subtitle: Text([c.role, c.email, c.phone].whereType<String>().join(' · ')),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

// ─── Tab 3: Assessment Questions ──────────────────────────────────────────────

class _AssessmentQuestionsTab extends StatefulWidget {
  const _AssessmentQuestionsTab();

  @override
  State<_AssessmentQuestionsTab> createState() => _AssessmentQuestionsTabState();
}

class _AssessmentQuestionsTabState extends State<_AssessmentQuestionsTab> {
  String _selectedAssessment = 'phq9';
  List<dynamic> _questions = [];
  bool _loading = false;

  final _questionCtrl = TextEditingController();
  final _optionsCtrl = TextEditingController();
  String _responseType = 'LIKERT';
  int _index = 0;

  final List<String> _assessments = [
    'phq9', 'gad7', 'pcl5', 'gds', 'audit', 'isi', 'mdq', 'custom',
  ];

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final resp = await ApiClient.instance.get('/admin/assessments/$_selectedAssessment/questions');
      if (resp.statusCode == 200) {
        setState(() => _questions = jsonDecode(resp.body) as List<dynamic>);
      }
    } catch (_) {
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _addQuestion() async {
    if (_questionCtrl.text.trim().isEmpty) return;
    List? options;
    if (_optionsCtrl.text.trim().isNotEmpty) {
      options = _optionsCtrl.text.split(',').map((s) => s.trim()).toList();
    }
    try {
      await ApiClient.instance.post(
        '/admin/assessments/$_selectedAssessment/questions',
        body: {
          'assessment_id': _selectedAssessment,
          'question_index': _index,
          'question_text': _questionCtrl.text.trim(),
          'response_type': _responseType,
          'options': options,
        },
      );
      _questionCtrl.clear();
      _optionsCtrl.clear();
      _index++;
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('Assessment:', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _selectedAssessment,
                    items: _assessments.map((a) => DropdownMenuItem(value: a, child: Text(a.toUpperCase()))).toList(),
                    onChanged: (v) {
                      setState(() { _selectedAssessment = v!; _questions = []; });
                      _load();
                    },
                  ),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Load Questions'),
                  ),
                ],
              ),
              const Divider(),
              Text('Add Question', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 8),
              TextField(
                controller: _questionCtrl,
                decoration: _inputDecoration('Question text *'),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _optionsCtrl,
                      decoration: _inputDecoration('Options (comma-separated, optional)'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                    value: _responseType,
                    items: ['LIKERT', 'YES_NO', 'FREE_TEXT', 'SCALE']
                        .map((t) => DropdownMenuItem(value: t, child: Text(t, style: const TextStyle(fontSize: 13))))
                        .toList(),
                    onChanged: (v) => setState(() => _responseType = v!),
                  ),
                  const SizedBox(width: 8),
                  Text('#$_index', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _addQuestion,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8FB9A8), foregroundColor: Colors.white),
                    child: const Text('Add'),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _questions.isEmpty
                  ? Center(child: Text('No custom questions for $_selectedAssessment. Add one above.'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _questions.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final q = _questions[i] as Map<String, dynamic>;
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: const Color(0xFF6C63FF).withOpacity(0.1),
                            child: Text('${q['question_index']}', style: const TextStyle(color: Color(0xFF6C63FF), fontWeight: FontWeight.bold)),
                          ),
                          title: Text(q['question_text'] as String),
                          subtitle: Text(q['response_type'] as String),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

InputDecoration _inputDecoration(String label) => InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(fontSize: 13),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      isDense: true,
    );
