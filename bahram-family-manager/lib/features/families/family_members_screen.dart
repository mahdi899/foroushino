import 'package:flutter/material.dart';

import 'package:bahram_family_manager/features/families/widgets/family_members_panel.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class FamilyMembersScreen extends StatelessWidget {
  const FamilyMembersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('اعضای کانال')),
      body: Padding(
        padding: AppBreakpoints.pagePadding(context),
        child: const SizedBox.expand(
          child: FamilyMembersPanel(showFamilyName: true),
        ),
      ),
    );
  }
}
