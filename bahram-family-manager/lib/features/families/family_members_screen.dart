import 'package:flutter/material.dart';

import 'package:provider/provider.dart';

import 'package:bahram_family_manager/features/families/widgets/family_members_panel.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class FamilyMembersScreen extends StatelessWidget {
  const FamilyMembersScreen({
    super.key,
    this.familyId,
    this.familyName,
    this.entryEventId,
    this.entryLinkId,
    this.entrySource,
    this.title,
    this.showFamilyName = true,
    this.showAttribution = false,
  });

  final int? familyId;
  final String? familyName;
  final int? entryEventId;
  final int? entryLinkId;
  final String? entrySource;
  final String? title;
  final bool showFamilyName;
  final bool showAttribution;

  @override
  Widget build(BuildContext context) {
    final canManage = context.watch<AppState>().user?.can('family.families.manage') ?? false;

    return AdaptiveScaffold(
      appBar: ManagerAppBar(title: Text(title ?? 'اعضای کانال')),
      body: Padding(
        padding: AppBreakpoints.pagePadding(context),
        child: SizedBox.expand(
          child: FamilyMembersPanel(
            familyId: familyId,
            familyName: familyName,
            title: title,
            entryEventId: entryEventId,
            entryLinkId: entryLinkId,
            entrySource: entrySource,
            showFamilyName: showFamilyName,
            showAttribution: showAttribution,
            canManageMembers: canManage && familyId != null,
          ),
        ),
      ),
    );
  }
}
