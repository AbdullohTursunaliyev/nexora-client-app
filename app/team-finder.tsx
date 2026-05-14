import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { router } from 'expo-router';
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import MailIcon from '../components/icons/MailIcon';
import { useT } from '../lib/i18n/LocaleProvider';
import { useToast } from '../components/common/Toast';
import { getErrorMessage } from '../lib/api/client';
import * as teamsApi from '../lib/api/services/teams';

interface FilterDropdownProps {
  label: string;
  value: string;
  onPress?: () => void;
}

function FilterDropdown({ label, value, onPress }: FilterDropdownProps) {
  return (
    <Pressable style={styles.dropdown} onPress={onPress} disabled={!onPress}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <View style={styles.dropdownInner}>
        <Text style={styles.dropdownValue}>{value}</Text>
        <ChevronDownIcon size={14} color="#8B95A8" />
      </View>
    </Pressable>
  );
}

const GAMES = ['CS2', 'Dota 2', 'PUBG', 'FC24', 'Valorant'];

/**
 * Team Finder.
 *
 * Search players for the active club + game and either invite them to a
 * team you already own (the picker shows your teams), or create a new
 * team and invite once it exists. The "create" path closes by handing
 * the new team to the chat screen so the inviter can keep the
 * conversation going. Empty `teams` list → "create first" hint.
 *
 * BE returns players with `is_stub: true` for the seeded demo data —
 * those are real DB rows under the hood (`teams_players` view), so
 * inviting them works against the real `/teams/{id}/invite` endpoint.
 */
export default function TeamFinderScreen() {
  const t = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'find' | 'create'>('find');
  const [game, setGame] = useState('CS2');
  const [microOnly, setMicroOnly] = useState(true);
  const [players, setPlayers] = useState<teamsApi.Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantTeams, setTenantTeams] = useState<teamsApi.Team[]>([]);
  const [showInvitePicker, setShowInvitePicker] = useState<teamsApi.Player | null>(null);
  const [invitingTeamId, setInvitingTeamId] = useState<number | null>(null);

  // Incoming team invites — pre-fix this list never loaded because
  // the FE service had no function for it, even though the BE
  // endpoint shipped months ago. Users who received an invite saw
  // nothing about it in the app.
  const [invites, setInvites] = useState<teamsApi.TeamInvite[]>([]);
  const [respondingInviteId, setRespondingInviteId] = useState<number | null>(null);

  // Create-team form
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom-sheet game picker. Replaces the cycle-button UX that
  // pre-fix required users to tap up to 4 times to find Valorant —
  // an awful interaction borrowed from a quick prototype that
  // never got revised. Sheet pattern matches login + settings
  // language pickers so the visual idiom is consistent across the
  // app.
  const [gameSheetOpen, setGameSheetOpen] = useState(false);

  const loadEverything = useCallback(
    async (surfaceSpinner = false) => {
      if (surfaceSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        // Surface each failure as a toast — pre-fix `.catch(() => [])`
        // silently turned 401/network errors into "no players /
        // teams" which made the screen look broken instead of
        // surfacing the underlying network state.
        const [players, teams, invitesList] = await Promise.all([
          teamsApi.searchPlayers({ game, micOnly: microOnly }).catch((e) => {
            toast.error(getErrorMessage(e));
            return [];
          }),
          teamsApi.listTeams(game).catch((e) => {
            toast.error(getErrorMessage(e));
            return [];
          }),
          // Invites list — silent on failure (it's a secondary
          // surface). The primary "find players / teams" data is
          // already loading, we don't want to spam two error
          // toasts for one network hiccup.
          teamsApi.listTeamInvites().catch(() => []),
        ]);
        setPlayers(players);
        setTenantTeams(teams);
        setInvites(invitesList);
      } finally {
        if (surfaceSpinner) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [game, microOnly, toast],
  );

  const onRespondInvite = async (
    inviteId: number,
    action: 'accept' | 'decline',
    teamName: string,
    teamId: number,
  ) => {
    if (respondingInviteId) return;
    setRespondingInviteId(inviteId);
    try {
      const res = await teamsApi.respondToTeamInvite(inviteId, action);
      // Optimistic remove regardless of action — both accept and
      // decline take the row out of the user's pending list.
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (res.status === 'accepted') {
        toast.success(t.teamFinder.inviteAcceptedToast.replace('{name}', teamName));
        // Open the chat for the newly-joined team — gets the user
        // into the conversation while the moment is fresh.
        router.push({
          pathname: '/team-chat',
          params: { teamId: String(teamId), teamName },
        });
        // Refetch teams list in background so "My teams" includes
        // the new membership on next visit.
        void loadEverything();
      } else {
        toast.info(t.teamFinder.inviteDeclinedToast);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setRespondingInviteId(null);
    }
  };

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  const onPickTeamForInvite = (player: teamsApi.Player) => {
    // Only OWNED teams matter for the picker — BE rejects invites
    // from non-owner callers with 403. Pre-fix this branched on
    // `tenantTeams.length` (all tenant teams), so a user in
    // someone else's team would see the picker, tap that team,
    // and get a Forbidden toast they couldn't act on.
    if (ownedTeams.length === 0) {
      toast.info(t.teamFinder.noTeamHint);
      setTab('create');
      return;
    }
    setShowInvitePicker(player);
  };

  const onInvite = async (teamId: number) => {
    if (!showInvitePicker || invitingTeamId) return;
    setInvitingTeamId(teamId);
    try {
      await teamsApi.inviteToTeam(teamId, showInvitePicker.user_id);
      toast.success(t.teamFinder.invitedToast);
      setShowInvitePicker(null);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setInvitingTeamId(null);
    }
  };

  const onCreateTeam = async () => {
    const name = newTeamName.trim();
    if (name.length < 2 || creating) return;
    setCreating(true);
    try {
      const team = await teamsApi.createTeam({ name, game });
      setTenantTeams((prev) => [team, ...prev]);
      setNewTeamName('');
      toast.success(t.teamFinder.createdToast);
      // Auto-navigate to the new team's chat. Pre-fix the user
      // landed back on the Find tab with no visible trace of the
      // team they just created — there was no "My Teams" section
      // on the screen, so the only way to "find" their creation
      // was to try inviting someone (which opens the picker that
      // shows their owned teams). Dropping the user straight into
      // chat matches what Telegram / Discord do after channel
      // creation and lets them invite teammates immediately via
      // the team-chat "..." menu / future invite flow.
      router.push({
        pathname: '/team-chat',
        params: { teamId: String(team.id), teamName: team.name },
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  // Mic-only filter is now BE-authoritative — `MobileTeamController`
  // returns players matching the `?mic=1` query when the toggle is
  // on. Pre-fix the FE re-filtered the same list client-side too;
  // that re-filter was dead code (BE already gated) AND would have
  // double-counted false positives if the BE ever changed semantics.
  // Audit L1.
  const filteredPlayers = players;

  // "My teams" = teams the user is in (owner OR member). Sorted so
  // owned teams sit first — those are the ones with admin actions
  // (invite, disband) and the user thinks of as "theirs".
  // Pre-fix the FE used the un-filtered `tenantTeams` everywhere
  // (variable was misleadingly named `myTeams`), which:
  //   1. Showed every tenant team in the invite picker → tapping a
  //      non-owned one 422'd with "Forbidden".
  //   2. Made the eventual "My Teams" section impossible to build —
  //      we couldn't distinguish own from other.
  const myTeams = useMemo(
    () =>
      tenantTeams
        .filter((tm) => tm.is_member === true || tm.is_owner === true)
        // Coerce to boolean before Number() — pre-fix this read
        // `Number(b.is_owner)` directly, but `is_owner` is typed
        // `boolean | undefined`; `Number(undefined) === NaN` and
        // `NaN - NaN === NaN`, which means undefined V8 compare-fn
        // behaviour. Today the BE always emits is_owner so it works,
        // but the type allows undefined and a future BE drop would
        // silently break the sort. Audit M1.
        .sort((a, b) => Number(!!b.is_owner) - Number(!!a.is_owner)),
    [tenantTeams],
  );

  // Only owners can invite — BE returns 403 for non-owners on
  // `/teams/{id}/invite`. Filter the picker to teams the user
  // actually owns so we never let them tap into a guaranteed 403.
  const ownedTeams = useMemo(
    () => tenantTeams.filter((tm) => tm.is_owner === true),
    [tenantTeams],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardSafeView>
      <SimpleHeader title={t.teamFinder.headerTitle} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEverything(true)}
            tintColor="#00CFFF"
          />
        }
      >
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, tab === 'find' && styles.tabActive]}
            onPress={() => setTab('find')}
          >
            <Text style={[styles.tabText, tab === 'find' && styles.tabTextActive]}>
              {t.friends.tabSearch}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'create' && styles.tabActive]}
            onPress={() => setTab('create')}
          >
            <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>
              {t.teamFinder.createBtn}
            </Text>
          </Pressable>
        </View>

        {tab === 'find' ? (
          <>
            {/* Incoming team invites — pre-fix this list was
                returned by the BE for months but the FE service had
                no function to fetch it, so invitees never saw their
                pending team invites. Now each invite renders as a
                card with Accept / Decline actions. Accept auto-
                navigates to the team chat; both actions optimistically
                remove the row from the list. */}
            {invites.length > 0 && (
              <View style={styles.invitesWrap}>
                <View style={styles.invitesHeader}>
                  <View style={styles.invitesIconWrap}>
                    <MailIcon size={14} color="#00CFFF" />
                  </View>
                  <Text style={styles.invitesTitle}>
                    {t.teamFinder.invitesTitle.replace('{n}', String(invites.length))}
                  </Text>
                </View>
                {invites.map((inv) => {
                  const isResponding = respondingInviteId === inv.id;
                  return (
                    <View key={inv.id} style={styles.inviteCard}>
                      <View style={styles.inviteInfo}>
                        <Text style={styles.inviteTeamName} numberOfLines={1}>
                          {inv.team_name || t.teamFinder.unknownTeam}
                        </Text>
                        <Text style={styles.inviteMeta} numberOfLines={1}>
                          {(inv.game || '—').toUpperCase()} · {t.teamFinder.inviteSlotsLabel.replace(
                            '{n}',
                            String(inv.members_max),
                          )}
                        </Text>
                      </View>
                      {isResponding ? (
                        <ActivityIndicator color="#00CFFF" />
                      ) : (
                        <View style={styles.inviteActions}>
                          {/* Accept = solid cyan sm secondary so it
                              reads as the obvious-good action. */}
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() =>
                              onRespondInvite(inv.id, 'accept', inv.team_name, inv.team_id)
                            }
                            accessibilityRole="button"
                            accessibilityLabel={t.teamFinder.inviteAccept}
                            style={inviteAcceptBtnStyles.btn}
                          >
                            <Text
                              style={inviteAcceptBtnStyles.label}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.85}
                            >
                              {t.teamFinder.inviteAccept}
                            </Text>
                          </TouchableOpacity>
                          {/* Decline = ghost (no fill) cyan label
                              so the destructive choice reads as
                              clearly subordinate. */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() =>
                              onRespondInvite(inv.id, 'decline', inv.team_name, inv.team_id)
                            }
                            accessibilityRole="button"
                            accessibilityLabel={t.teamFinder.inviteDecline}
                            style={inviteDeclineBtnStyles.btn}
                          >
                            <Text
                              style={inviteDeclineBtnStyles.label}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.85}
                            >
                              {t.teamFinder.inviteDecline}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* My Teams section — pre-fix the screen had NO place
                to see your own teams. The only visible team-aware
                surface was the invite picker (which only opens
                when you tap "Invite" on a player). Now the user's
                teams (owned + member) sit prominently at the top
                of the Find tab, tappable to open chat. Owner teams
                lead with a "Captain" badge for context. */}
            {myTeams.length > 0 && (
              <View style={styles.myTeamsWrap}>
                <Text style={styles.myTeamsTitle}>
                  {t.teamFinder.myTeamsTitle.replace('{n}', String(myTeams.length))}
                </Text>
                {myTeams.map((tm) => (
                  <TouchableOpacity
                    key={tm.id}
                    style={styles.myTeamCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/team-chat',
                        params: { teamId: String(tm.id), teamName: tm.name },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={tm.name}
                  >
                    <View style={styles.myTeamIconWrap}>
                      <Text style={styles.myTeamIconText}>
                        {(tm.name?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.myTeamInfo}>
                      <View style={styles.myTeamNameRow}>
                        <Text style={styles.myTeamName} numberOfLines={1}>
                          {tm.name}
                        </Text>
                        {tm.is_owner && (
                          <View style={styles.myTeamOwnerBadge}>
                            <Text style={styles.myTeamOwnerBadgeText}>
                              {t.teamChat.roleOwner}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.myTeamMeta} numberOfLines={1}>
                        {tm.game.toUpperCase()} · {tm.members_count}/{tm.members_max}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.filterRow}>
              <FilterDropdown
                label={t.teamFinder.gameDropdown}
                value={game}
                onPress={() => setGameSheetOpen(true)}
              />
              {/* Skill filter is a coming-soon placeholder — Nexora
                  doesn't yet track ELO per player, so the dropdown
                  is dimmed + tagged "Soon" instead of pretending to
                  be a live control. Pre-fix this rendered as a
                  normal dropdown that toast'd "coming soon" on tap,
                  which read as a broken feature. Now the disabled
                  look-and-feel makes the gating obvious. */}
              <View style={styles.dropdownDisabledWrap}>
                <FilterDropdown
                  label={t.teamFinder.skillDropdown}
                  value="—"
                />
                <View style={styles.dropdownSoonChip}>
                  <Text style={styles.dropdownSoonChipText}>{t.profile.soon}</Text>
                </View>
              </View>
            </View>

            {/* Mic-only toggle — similarly disabled. The BE returns
                an empty list when `mic=1` because there's no
                presence schema yet, so wiring it up would always
                show "no players". Dim + label so users know it's
                pending. */}
            <Pressable
              style={[styles.toggleRow, styles.toggleRowDisabled]}
              disabled
              hitSlop={8}
            >
              <View style={[styles.checkbox, styles.checkboxOff]} />
              <Text style={[styles.toggleLabel, styles.toggleLabelDisabled]}>
                {t.teamFinder.micToggle}
              </Text>
              <View style={styles.inlineSoonChip}>
                <Text style={styles.inlineSoonChipText}>{t.profile.soon}</Text>
              </View>
            </Pressable>

            <Text style={styles.sectionTitle}>{t.teamFinder.sectionPlayers}</Text>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#00CFFF" />
              </View>
            ) : filteredPlayers.length === 0 ? (
              <Text style={styles.emptyText}>{t.teamFinder.emptyPlayers}</Text>
            ) : (
              filteredPlayers.map((p) => (
                <PlayerRow
                  key={p.user_id}
                  player={p}
                  onInvite={() => onPickTeamForInvite(p)}
                  labels={t}
                />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t.teamFinder.createSectionName}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.teamFinder.createPlaceholder}
              placeholderTextColor="#6B7280"
              value={newTeamName}
              onChangeText={setNewTeamName}
              maxLength={32}
              autoCapitalize="words"
            />
            <Text style={styles.helper}>
              {t.teamFinder.createHelperGame.replace('{game}', game)}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {tab === 'create' ? (
          // Create-team commit CTA — full lg pill, gated on name
          // length ≥ 2 (BE validator) and not-already-submitting.
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCreateTeam}
            disabled={newTeamName.trim().length < 2 || creating}
            accessibilityRole="button"
            accessibilityLabel={t.teamFinder.createBtn}
            accessibilityState={{
              disabled: newTeamName.trim().length < 2 || creating,
              busy: creating,
            }}
            style={[
              createTeamBtnStyles.btn,
              (newTeamName.trim().length < 2 || creating) &&
                createTeamBtnStyles.btnDisabled,
            ]}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={createTeamBtnStyles.fill}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={createTeamBtnStyles.label}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t.teamFinder.createBtn}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          // Find-tab "Create team" affordance — same pill shape so
          // the bottom-bar control reads consistently between tabs;
          // tapping here just switches into the Create tab.
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('create')}
            accessibilityRole="button"
            accessibilityLabel={t.teamFinder.createBtn}
            style={createTeamBtnStyles.btn}
          >
            <LinearGradient
              colors={['#3B5BF5', '#8B3DF5']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={createTeamBtnStyles.fill}
            >
              <Text
                style={createTeamBtnStyles.label}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t.teamFinder.createBtn}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
      </KeyboardSafeView>

      {/* Team-picker modal — fixed layout: backdrop Pressable lives
          OUTSIDE the card via absoluteFill, so it doesn't intercept
          taps on the card content. The legacy `<Pressable> >
          <Pressable onPress=stopPropagation>` pattern was the same
          DOM idiom we removed from qr-scan + settings — it doesn't
          map cleanly to RN's gesture system. */}
      <Modal
        visible={!!showInvitePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvitePicker(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowInvitePicker(null)}
            accessibilityRole="button"
            accessibilityLabel={t.teamFinder.cancelBtn}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t.teamFinder.invitePickerTitle.replace(
                '{name}',
                showInvitePicker?.name ?? '',
              )}
            </Text>
            {ownedTeams.length === 0 ? (
              <Text style={styles.emptyText}>{t.teamFinder.noTeamHint}</Text>
            ) : (
              ownedTeams.map((tm) => (
                <Pressable
                  key={tm.id}
                  style={styles.teamRow}
                  onPress={() => onInvite(tm.id)}
                  disabled={invitingTeamId === tm.id}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamName}>{tm.name}</Text>
                    <Text style={styles.teamMeta}>
                      {tm.game.toUpperCase()} · {tm.members_count}/{tm.members_max}
                    </Text>
                  </View>
                  {invitingTeamId === tm.id && <ActivityIndicator color="#00CFFF" />}
                </Pressable>
              ))
            )}
            {/* Modal cancel — md (44pt) full-width secondary
                (solid cyan) so the only visual emphasis on this
                modal is the team list above; cancel sits below
                without competing for attention. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowInvitePicker(null)}
              accessibilityRole="button"
              accessibilityLabel={t.teamFinder.cancelBtn}
              style={pickerCancelBtnStyles.btn}
            >
              <Text
                style={pickerCancelBtnStyles.label}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t.teamFinder.cancelBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Game picker bottom sheet — replaces the cycle-button UX.
          Sibling-backdrop layout (the same fix we applied to the
          team picker above) keeps taps inside the sheet from
          dismissing the modal. */}
      <Modal
        visible={gameSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setGameSheetOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setGameSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.teamFinder.cancelBtn}
          />
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.teamFinder.gameSheetTitle}</Text>
            <View style={styles.sheetList}>
              {GAMES.map((g) => {
                const isActive = g === game;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.sheetRow, isActive && styles.sheetRowActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setGame(g);
                      setGameSheetOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={styles.sheetRowLabel}>{g}</Text>
                    {isActive && <View style={styles.sheetRowCheck} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Single player row — encapsulates the avatar fallback (Lucide User
 * when the URL is missing or fails to load) and the `is_stub` UX
 * hint. Pre-fix the screen rendered stub rows identically to real
 * ones, so users saw fake "LVL 1, 1200 ELO, offline" data and
 * couldn't tell which players were genuine presence vs. placeholder.
 */
function PlayerRow({
  player,
  onInvite,
  labels,
}: {
  player: teamsApi.Player;
  onInvite: () => void;
  labels: ReturnType<typeof useT>;
}) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatar = !!player.avatar_url && !avatarBroken;
  const isStub = player.is_stub === true;

  // Status colour resolver — same lookup as the v1 inline ternary
  // but isolated so the JSX stays readable.
  const statusColor =
    player.status === 'online'
      ? '#22C55E'
      : player.status === 'in-game'
        ? '#F59E0B'
        : '#6B7280';
  const statusLabel =
    player.status === 'online'
      ? labels.teamFinder.statusOnline
      : player.status === 'in-game'
        ? labels.teamFinder.statusInGame
        : labels.teamFinder.statusOffline;

  return (
    <View style={styles.playerCard}>
      {showAvatar ? (
        <Image
          source={{ uri: player.avatar_url }}
          style={styles.avatar}
          onError={() => setAvatarBroken(true)}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <User size={20} color="#00CFFF" strokeWidth={1.8} />
        </View>
      )}

      <View style={styles.playerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.playerName}>{player.name}</Text>
          {/* Level chip is the only "rank" surface we currently
              have. We hide it for stub rows — showing LVL 1 to
              everyone for stubs would falsely suggest a real
              ranking system. */}
          {!isStub && <Text style={styles.playerLevel}>LVL {player.level}</Text>}
        </View>
        <Text style={styles.playerRole}>
          {player.role}
          {!isStub && (
            <>
              {' · '}
              <Text style={{ color: '#8B95A8' }}>{player.elo} ELO</Text>
            </>
          )}
        </Text>
        {/* Presence dot only when we have real presence data.
            Stub rows show a static "from this club" hint instead
            so users aren't misled into thinking the row is offline
            when we just don't know. */}
        {isStub ? (
          <Text style={styles.stubHint}>{labels.teamFinder.stubHint}</Text>
        ) : (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        )}
      </View>
      {/* Player-row invite CTA — sm (38pt) solid cyan secondary
          so it sits flush against the row's right edge without
          consuming a disproportionate share of the row width. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onInvite}
        accessibilityRole="button"
        accessibilityLabel={labels.teamFinder.inviteBtn}
        style={playerInviteBtnStyles.btn}
      >
        <Text
          style={playerInviteBtnStyles.label}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {labels.teamFinder.inviteBtn}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 4,
    height: 44,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00CFFF',
  },
  tabText: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13.5,
    color: '#8B95A8',
  },
  tabTextActive: {
    color: '#080F16',
    fontFamily: Fonts.inter.semiBold,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dropdown: {
    flex: 1,
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  dropdownLabel: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#8B95A8',
  },
  dropdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  toggleRowDisabled: {
    opacity: 0.55,
  },
  toggleLabelDisabled: {
    color: '#6B7280',
  },
  // Disabled-look wrapper around the Skill filter. Renders a small
  // "Soon" chip in the top-right of the dropdown so the user sees
  // the gating at a glance.
  dropdownDisabledWrap: {
    flex: 1,
    position: 'relative',
    opacity: 0.55,
  },
  dropdownSoonChip: {
    position: 'absolute',
    top: 4,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 207, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.35)',
  },
  dropdownSoonChipText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 8.5,
    color: '#00CFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inlineSoonChip: {
    marginLeft: 'auto',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 207, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.3)',
  },
  inlineSoonChipText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 9.5,
    color: '#00CFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Incoming-invites block — sits at the top of the Find tab.
  invitesWrap: {
    marginTop: 12,
    marginBottom: 6,
  },
  invitesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  invitesIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 207, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitesTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#00CFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.20)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  inviteInfo: {
    flex: 1,
    gap: 3,
  },
  inviteTeamName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  inviteMeta: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 6,
  },
  // My Teams section — visible at the top of the Find tab, lists
  // the user's owner+member teams as tappable cards that open the
  // team chat. Pre-fix this section didn't exist on the screen at
  // all — created teams were invisible until the user tried to
  // invite someone.
  myTeamsWrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  myTeamsTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 12.5,
    color: '#00CFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  myTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141823',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.12)',
  },
  // Initial-letter tile — cheap visual identifier until we wire
  // real team_cover URLs through the team listing payload.
  myTeamIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 207, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myTeamIconText: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
    color: '#00CFFF',
  },
  myTeamInfo: {
    flex: 1,
    gap: 3,
  },
  myTeamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myTeamName: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13.5,
    color: Colors.text,
    flexShrink: 1,
  },
  myTeamOwnerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  myTeamOwnerBadgeText: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 9,
    color: '#F59E0B',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  myTeamMeta: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
  },
  // Bottom-sheet picker styles — shared by the game picker. Same
  // visual idiom as login + settings language sheets.
  sheetRoot: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#141823',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4250',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: Fonts.inter.bold,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 14,
  },
  sheetList: { gap: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1F2B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sheetRowActive: {
    borderColor: '#00CFFF',
    backgroundColor: 'rgba(0, 207, 255, 0.06)',
  },
  sheetRowLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  sheetRowCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00CFFF',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#00CFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOff: {
    backgroundColor: '#1F2533',
    borderWidth: 1,
    borderColor: '#3A4250',
  },
  checkboxFill: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#080F16',
  },
  toggleLabel: {
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    color: Colors.text,
  },
  sectionTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: {
    fontFamily: Fonts.inter.regular,
    fontSize: 13,
    color: '#8B95A8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#141823',
    marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F2533' },
  // Lucide-icon fallback when avatar_url is empty / broken. Same
  // dimensions as the real avatar so the row layout doesn't shift
  // on load-error.
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 255, 0.2)',
  },
  // Static hint shown in place of the presence dot/status text on
  // stub player rows — communicates "we know they're in this club
  // but we don't have live presence yet".
  stubHint: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  playerInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: { fontFamily: Fonts.inter.semiBold, fontSize: 13.5, color: Colors.text },
  playerLevel: { fontFamily: Fonts.inter.medium, fontSize: 11, color: '#A78BFA' },
  playerRole: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.inter.medium, fontSize: 11 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    backgroundColor: '#141823',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: Colors.text,
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
  },
  helper: {
    fontFamily: Fonts.inter.regular,
    fontSize: 12,
    color: '#8B95A8',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#141823',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2533',
    borderRadius: 10,
    padding: 12,
  },
  teamName: { fontFamily: Fonts.inter.semiBold, fontSize: 14, color: Colors.text },
  teamMeta: {
    fontFamily: Fonts.inter.regular,
    fontSize: 11.5,
    color: '#8B95A8',
    marginTop: 2,
  },
});

// Inline invite accept/decline pair — sm (38pt) inline pills so the
// row keeps a single line. Accept = solid cyan secondary; Decline =
// ghost cyan label without fill.
const inviteAcceptBtnStyles = StyleSheet.create({
  btn: {
    height: 38,
    borderRadius: 999,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  label: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});

const inviteDeclineBtnStyles = StyleSheet.create({
  btn: {
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#00CFFF',
    fontFamily: Fonts.inter.medium,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});

// Inline bottom-bar create-team CTA — full-width 52pt lg pill.
// Same shape whether the button kicks off a create call or just
// switches tabs (the disabled state is what changes).
const createTeamBtnStyles = StyleSheet.create({
  btn: { height: 52, borderRadius: 999, alignSelf: 'stretch', overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  fill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

// Inline picker-modal cancel — md (44pt) full-width solid cyan
// secondary anchored under the team list.
const pickerCancelBtnStyles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: 999,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  label: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});

// Inline per-row invite CTA — sm (38pt) solid cyan so it reads as
// "the affordance to act on this player" without leaning into the
// row.
const playerInviteBtnStyles = StyleSheet.create({
  btn: {
    height: 38,
    borderRadius: 999,
    backgroundColor: '#00CFFF',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  label: {
    color: '#0B0F16',
    fontFamily: Fonts.inter.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
