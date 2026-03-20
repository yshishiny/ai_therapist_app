import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

class Resource {
  final String id;
  final String title;
  final String category;
  final String? author;
  final String? description;
  final String? fileUrl;

  const Resource({
    required this.id,
    required this.title,
    required this.category,
    this.author,
    this.description,
    this.fileUrl,
  });

  factory Resource.fromApi(Map<String, dynamic> j) => Resource(
        id: j['id'] as String,
        title: j['title'] as String,
        category: j['category'] as String? ?? 'BOOK',
        author: j['author'] as String?,
        description: j['description'] as String?,
        fileUrl: j['file_url'] as String?,
      );
}

class ReferenceLibraryScreen extends StatefulWidget {
  const ReferenceLibraryScreen({super.key});

  @override
  State<ReferenceLibraryScreen> createState() => _ReferenceLibraryScreenState();
}

class _ReferenceLibraryScreenState extends State<ReferenceLibraryScreen> {
  List<Resource> _allResources = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchResources();
  }

  Future<void> _fetchResources() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final resp = await ApiClient.instance.get('/admin/resources');
      if (resp.statusCode == 200) {
        final raw = jsonDecode(resp.body) as List<dynamic>;
        setState(() {
          _allResources = raw
              .map((e) => Resource.fromApi(e as Map<String, dynamic>))
              .toList();
        });
      } else {
        setState(() => _error = 'Failed to load. Code: ${resp.statusCode}');
      }
    } catch (e) {
      setState(() => _error = 'Network error loading resources.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F7F8),
        appBar: AppBar(
          title: Text('Reference Room',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF2D3142),
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _fetchResources,
            )
          ],
          bottom: TabBar(
            indicatorColor: const Color(0xFF8FB9A8),
            labelColor: const Color(0xFF8FB9A8),
            unselectedLabelColor: Colors.grey,
            tabs: const [
              Tab(text: 'Guidelines'),
              Tab(text: 'Books'),
              Tab(text: 'Tools'),
            ],
          ),
        ),
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFF8FB9A8)))
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline,
                            size: 48, color: Colors.red.shade300),
                        const SizedBox(height: 16),
                        Text(_error!,
                            style: const TextStyle(color: Colors.red)),
                      ],
                    ),
                  )
                : TabBarView(
                    children: [
                      _buildList(
                          ['ARTICLE', 'OTHER'], Icons.article, Colors.indigo),
                      _buildList(['BOOK'], Icons.menu_book, Colors.orange),
                      _buildList(
                          ['HANDOUT', 'VIDEO'], Icons.build, Colors.teal),
                    ],
                  ),
      ),
    );
  }

  Widget _buildList(
      List<String> categories, IconData defaultIcon, Color iconColor) {
    final items =
        _allResources.where((r) => categories.contains(r.category)).toList();

    if (items.isEmpty) {
      return Center(
        child: Text(
          'No items found in this section.',
          style: GoogleFonts.inter(color: Colors.grey),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final r = items[index];
        return _buildResourceCard(
          title: r.title,
          subtitle: r.author ?? r.category,
          description: r.description ?? '',
          icon: defaultIcon,
          color: iconColor,
          fileUrl: r.fileUrl,
        );
      },
    );
  }

  Widget _buildResourceCard({
    required String title,
    required String subtitle,
    required String description,
    required IconData icon,
    required Color color,
    String? fileUrl,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () {
          if (fileUrl != null && fileUrl.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Opening: \$fileUrl')),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                  content: Text('No file attached to this resource.')),
            );
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(subtitle,
                        style: GoogleFonts.inter(
                            fontSize: 13, color: Colors.blueGrey)),
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                              fontSize: 12, color: Colors.grey.shade600)),
                    ]
                  ],
                ),
              ),
              Icon(
                fileUrl != null && fileUrl.isNotEmpty
                    ? Icons.download
                    : Icons.chevron_right,
                size: 20,
                color: Colors.grey.shade400,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
