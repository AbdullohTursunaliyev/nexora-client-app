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
import KeyboardSafeView from '../components/common/KeyboardSafeView';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Fonts';
import SimpleHeader from '../components/common/SimpleHeader';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import Button from '../components/common/Button';
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
  const [myTeams, setMyTeams] = useState<teamsApi.Team[]>([]);
  const [showInvitePicker, setShowInvitePicker] = useState<teamsApi.Player | null>(null);
  const [invitingTeamId, setInvitingTeamId] = useState<number | null>(null);

  // Create-team form
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        const [players, teams] = await Promise.all([
          teamsApi.searchPlayers({ game, micOnly: microOnly }).catch((e) => {
            toast.error(getErrorMessage(e));
            return [];
          }),
          teamsApi.listTeams(game).catch((e) => {
            toast.error(getErrorMessage(e));
            return [];
          }),
        ]);
        setPlayers(players);
        setMyTeams(teams);
      } finally {
        if (surfaceSpinner) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [game, microOnly],
  );

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  const onPickTeamForInvite = (player: teamsApi.Player) => {
    if (myTeams.length === 0) {
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
      setMyTeams((prev) => [team, ...prev]);
      setNewTeamName('');
      toast.success(t.teamFinder.createdToast);
      setTab('find');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const filteredPlayers = useMemo(
    () => (microOnly ? players.filter((p) => p.has_mic !== false) : players),
    [players, microOnly],
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
            <View style={styles.filterRow}>
              <FilterDropdown
                label={t.teamFinder.gameDropdown}
                value={game}
                onPress={() => {
                  // Cycle through the supported games. Real screen could
                  // open a bottom-sheet picker; cycle is the smallest
                  // workable hook until that ships.
                  const idx = GAMES.indexOf(game);
                  setGame(GAMES[(idx + 1) % GAMES.length]);
                }}
              />
              {/* Skill filter is a coming-soon placeholder — Nexora
                  doesn't yet track ELO per player, so the dropdown
                  surfaces a soon toast (audit MED). */}
              <FilterDropdown
                label={t.teamFinder.skillDropdown}
                value="—"
                onPress={() => toast.error(t.common.comingSoon)}
              />
            </View>

            <Pressable
              style={styles.toggleRow}
              onPress={() => setMicroOnly((m) => !m)}
              hitSlop={8}
            >
              <View style={[styles.checkbox, !microOnly && styles.checkboxOff]}>
                {microOnly && <View style={styles.checkboxFill} />}
              </View>
              <Text style={styles.toggleLabel}>{t.teamFinder.micToggle}</Text>
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
                <View key={p.user_id} style={styles.playerCard}>
                  <Image
                    source={{
                      uri:
                        p.avatar_url ??
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=141823&color=fff`,
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.playerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.playerName}>{p.name}</Text>
                      <Text style={styles.playerLevel}>LVL {p.level}</Text>
                    </View>
                    <Text style={styles.playerRole}>
                      {p.role} · <Text style={{ color: '#8B95A8' }}>{p.elo} ELO</Text>
                    </Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              p.status === 'online'
                                ? '#22C55E'
                                : p.status === 'in-game'
                                  ? '#F59E0B'
                                  : '#6B7280',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              p.status === 'online'
                                ? '#22C55E'
                                : p.status === 'in-game'
                                  ? '#F59E0B'
                                  : '#6B7280',
                          },
                        ]}
                      >
                        {p.status === 'online'
                          ? t.teamFinder.statusOnline
                          : p.status === 'in-game'
                            ? t.teamFinder.statusInGame
                            : t.teamFinder.statusOffline}
                      </Text>
                    </View>
                  </View>
                  <Button
                    label={t.teamFinder.inviteBtn}
                    variant="secondary"
                    size="sm"
                    onPress={() => onPickTeamForInvite(p)}
                  />
                </View>
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
          <Button
            label={t.teamFinder.createBtn}
            variant="primary"
            size="lg"
            fullWidth
            loading={creating}
            disabled={newTeamName.trim().length < 2 || creating}
            onPress={onCreateTeam}
          />
        ) : (
          <Button
            label={t.teamFinder.createBtn}
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => setTab('create')}
          />
        )}
      </View>
      </KeyboardSafeView>

      <Modal
        visible={!!showInvitePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvitePicker(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowInvitePicker(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {t.teamFinder.invitePickerTitle.replace(
                '{name}',
                showInvitePicker?.name ?? '',
              )}
            </Text>
            {myTeams.length === 0 ? (
              <Text style={styles.emptyText}>{t.teamFinder.noTeamHint}</Text>
            ) : (
              myTeams.map((tm) => (
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
            <Button
              label={t.teamFinder.cancelBtn}
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => setShowInvitePicker(null)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
