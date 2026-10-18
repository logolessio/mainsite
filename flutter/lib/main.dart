import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/state.dart';
import 'screens/shell.dart';
import 'ui/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LogolessApp());
}

class LogolessApp extends StatelessWidget {
  const LogolessApp({super.key, this.state});
  final AppState? state;

  @override
  Widget build(BuildContext context) => ChangeNotifierProvider<AppState>(
        create: (_) => state ?? (AppState()..start()),
        child: MaterialApp(
          title: 'logoless',
          debugShowCheckedModeBanner: false,
          theme: siteTheme(),
          home: const Shell(),
        ),
      );
}
