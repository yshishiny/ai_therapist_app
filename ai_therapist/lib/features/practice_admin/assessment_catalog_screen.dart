import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../services/assessment_catalog_service.dart';

class AssessmentCatalogScreen extends StatefulWidget {
  const AssessmentCatalogScreen({super.key});

  @override
  State<AssessmentCatalogScreen> createState() => _AssessmentCatalogScreenState();
}

class _AssessmentCatalogScreenState extends State<AssessmentCatalogScreen> {
  final _service = AssessmentCatalogService();

  final _templateKeyCtrl = TextEditingController();
  final _legacyTemplateIdCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  final _versionNameCtrl = TextEditingController();
  final _definitionCtrl = TextEditingController();
  final _scoringCtrl = TextEditingController();
  final _interpretationCtrl = TextEditingController();
  final _googleFormCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  List<AssessmentCatalogItem> _catalog = [];
  List<AssessmentVersion> _versions = [];
  String? _selectedCatalogId;
  String _templateType = 'SCREENING';
  String _licenseStatus = 'VERIFY';
  String _delivery = 'IN_APP';
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCatalog();
  }

  @override
  void dispose() {
    _templateKeyCtrl.dispose();
    _legacyTemplateIdCtrl.dispose();
    _nameCtrl.dispose();
    _descriptionCtrl.dispose();
    _versionNameCtrl.dispose();
    _definitionCtrl.dispose();
    _scoringCtrl.dispose();
    _interpretationCtrl.dispose();
    _googleFormCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _service.listCatalog();
      setState(() {
        _catalog = items;
        if (_selectedCatalogId == null && items.isNotEmpty) {
          _selectedCatalogId = items.first.id;
        } else if (items.every((item) => item.id != _selectedCatalogId)) {
          _selectedCatalogId = items.isNotEmpty ? items.first.id : null;
        }
      });
      await _loadVersions();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadVersions() async {
    final catalogId = _selectedCatalogId;
    if (catalogId == null) {
      setState(() => _versions = []);
      return;
    }
    try {
      final versions = await _service.listVersions(catalogId);
      setState(() => _versions = versions);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _createCatalogItem() async {
    if (_templateKeyCtrl.text.trim().isEmpty || _nameCtrl.text.trim().isEmpty) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final item = await _service.createCatalogItem(
        templateKey: _templateKeyCtrl.text.trim(),
        legacyTemplateId: _legacyTemplateIdCtrl.text.trim().isEmpty
            ? null
            : _legacyTemplateIdCtrl.text.trim(),
        name: _nameCtrl.text.trim(),
        templateType: _templateType,
        licenseStatus: _licenseStatus,
        description: _descriptionCtrl.text.trim().isEmpty
            ? null
            : _descriptionCtrl.text.trim(),
      );
      _templateKeyCtrl.clear();
      _legacyTemplateIdCtrl.clear();
      _nameCtrl.clear();
      _descriptionCtrl.clear();
      await _loadCatalog();
      setState(() => _selectedCatalogId = item.id);
      _showSnack('Assessment catalog item created.');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _createVersion() async {
    final catalogId = _selectedCatalogId;
    if (catalogId == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final version = await _service.createVersion(
        catalogId: catalogId,
        name: _versionNameCtrl.text.trim().isEmpty
            ? null
            : _versionNameCtrl.text.trim(),
        templateType: _templateType,
        licenseStatus: _licenseStatus,
        definitionJson: _parseOptionalJson(_definitionCtrl.text),
        scoringRules: _parseOptionalJson(_scoringCtrl.text),
        interpretationRules: _parseOptionalJson(_interpretationCtrl.text),
        delivery: _delivery,
        googleFormUrl: _googleFormCtrl.text.trim().isEmpty
            ? null
            : _googleFormCtrl.text.trim(),
        notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      );
      _versionNameCtrl.clear();
      _definitionCtrl.clear();
      _scoringCtrl.clear();
      _interpretationCtrl.clear();
      _googleFormCtrl.clear();
      _notesCtrl.clear();
      await _loadCatalog();
      await _loadVersions();
      _showSnack('Draft version ${version.versionNumber} created.');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _publishVersion(String versionId) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final version = await _service.publishVersion(versionId);
      await _loadCatalog();
      await _loadVersions();
      _showSnack('Published version ${version.versionNumber}.');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  dynamic _parseOptionalJson(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return null;
    return jsonDecode(text);
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Assessment catalog',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadCatalog,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) ...[
                    _ErrorBanner(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  _SectionCard(
                    title: 'Catalog items',
                    child: Column(
                      children: [
                        if (_catalog.isEmpty)
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text('No managed assessments yet.'),
                          )
                        else
                          DropdownButtonFormField<String>(
                            value: _selectedCatalogId,
                            decoration: const InputDecoration(
                              labelText: 'Selected catalog item',
                              border: OutlineInputBorder(),
                            ),
                            items: _catalog
                                .map(
                                  (item) => DropdownMenuItem(
                                    value: item.id,
                                    child: Text(
                                      '${item.name} (${item.templateKey})',
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) async {
                              setState(() => _selectedCatalogId = value);
                              await _loadVersions();
                            },
                          ),
                        const SizedBox(height: 12),
                        ..._catalog.map(
                          (item) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(item.name),
                            subtitle: Text(
                              '${item.templateKey} • ${item.templateType ?? 'Unknown'} • ${item.licenseStatus ?? 'VERIFY'}',
                            ),
                            trailing: Text(
                              item.currentPublishedVersionNumber != null
                                  ? 'v${item.currentPublishedVersionNumber}'
                                  : 'Draft only',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    title: 'Create catalog item',
                    child: Column(
                      children: [
                        TextField(
                          controller: _templateKeyCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Template key',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _legacyTemplateIdCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Legacy template id (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _nameCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Display name',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: _templateType,
                                decoration: const InputDecoration(
                                  labelText: 'Template type',
                                  border: OutlineInputBorder(),
                                ),
                                items: const [
                                  'SCREENING',
                                  'QUESTIONNAIRE',
                                  'PERSONALITY',
                                  'ART_THERAPY',
                                  'SOMATIC',
                                  'BODY_MAP',
                                  'TRAUMA',
                                ]
                                    .map(
                                      (value) => DropdownMenuItem(
                                        value: value,
                                        child: Text(value),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _templateType = value);
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: _licenseStatus,
                                decoration: const InputDecoration(
                                  labelText: 'License',
                                  border: OutlineInputBorder(),
                                ),
                                items: const ['FREE', 'LICENSED', 'VERIFY']
                                    .map(
                                      (value) => DropdownMenuItem(
                                        value: value,
                                        child: Text(value),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _licenseStatus = value);
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _descriptionCtrl,
                          maxLines: 2,
                          decoration: const InputDecoration(
                            labelText: 'Description',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _busy ? null : _createCatalogItem,
                            child: const Text('Create catalog item'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    title: 'Create draft version',
                    child: Column(
                      children: [
                        TextField(
                          controller: _versionNameCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Version name override (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: _delivery,
                          decoration: const InputDecoration(
                            labelText: 'Delivery',
                            border: OutlineInputBorder(),
                          ),
                          items: const ['IN_APP', 'GOOGLE_FORM']
                              .map(
                                (value) => DropdownMenuItem(
                                  value: value,
                                  child: Text(value),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _delivery = value);
                            }
                          },
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _definitionCtrl,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Definition JSON (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _scoringCtrl,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Scoring rules JSON (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _interpretationCtrl,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Interpretation rules JSON (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _googleFormCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Google Form URL (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _notesCtrl,
                          maxLines: 2,
                          decoration: const InputDecoration(
                            labelText: 'Notes (optional)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _busy || _selectedCatalogId == null
                                ? null
                                : _createVersion,
                            child: const Text('Create draft version'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    title: 'Versions',
                    child: _versions.isEmpty
                        ? const Text('No versions for the selected catalog item.')
                        : Column(
                            children: _versions
                                .map(
                                  (version) => ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(
                                      '${version.name} • v${version.versionNumber}',
                                    ),
                                    subtitle: Text(
                                      '${version.status} • ${version.delivery ?? 'IN_APP'}',
                                    ),
                                    trailing: version.status == 'published'
                                        ? const Icon(
                                            Icons.check_circle,
                                            color: Colors.green,
                                          )
                                        : TextButton(
                                            onPressed: _busy
                                                ? null
                                                : () => _publishVersion(version.id),
                                            child: const Text('Publish'),
                                          ),
                                  ),
                                )
                                .toList(),
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Text(
        message,
        style: GoogleFonts.inter(color: Colors.red.shade900),
      ),
    );
  }
}
