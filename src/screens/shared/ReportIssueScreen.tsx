import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking, Tone } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, PillPicker,
} from '../../components/ui';

/**
 * Report a problem — the one screen every role shares.
 *
 * Anyone can file one. What differs by role is what you see and what you can
 * do with it: a worker or customer sees their own reports; an org admin sees
 * their organisation's and resolves what is theirs to fix, escalating what
 * is not; a platform admin sees everything and is the end of the line.
 *
 * The server enforces all of that — this screen only hides controls that
 * would be rejected anyway, so the UI and the permissions cannot disagree.
 */

// Mirrors the server's createSchema (subject min 3, body min 10). Kept as
// named constants so the field hints and the validation cannot drift apart.
const MIN_SUBJECT = 3;
const MIN_BODY = 10;

const CATEGORIES = [
  { value: 'cannot_do_my_job', label: 'Blocking my work' },
  { value: 'bug', label: 'Something is broken' },
  { value: 'wrong_data', label: 'Wrong numbers' },
  { value: 'account_access', label: 'Cannot sign in' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Minor' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Urgent' },
  { value: 'blocking', label: 'Cannot work' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const SEVERITY_TONE: Record<string, Tone> = {
  blocking: 'error',
  high: 'warning',
  normal: 'info',
  low: 'neutral',
};

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'Being looked at', tone: 'info' },
  resolved: { label: 'Fixed', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

function whenLabel(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  const days = Math.floor(mins / 1440);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ReportIssueScreen() {
  const alert = useAppAlert();
  const { actor } = useAuth();
  const isSysadmin = actor?.type === 'platform';
  const isOrgAdmin = actor?.role === 'orgadmin';
  // Most reports are the organisation's own to fix, so an org admin resolves
  // their staff's directly. What they cannot fix, they escalate — and only
  // they can, since a platform admin has no higher tier to pass it to.
  const canTriage = isSysadmin || isOrgAdmin;

  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Compose
  const [composing, setComposing] = useState(false);
  const [category, setCategory] = useState('cannot_do_my_job');
  const [severity, setSeverity] = useState('normal');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Triage — org admin for their own organisation, platform admin for all
  const [triageTarget, setTriageTarget] = useState<any>(null);
  const [triageStatus, setTriageStatus] = useState('in_progress');
  const [resolution, setResolution] = useState('');
  const [escalate, setEscalate] = useState(false);
  const [escalationNote, setEscalationNote] = useState('');
  const [savingTriage, setSavingTriage] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listIssues();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCompose = () => {
    setCategory('cannot_do_my_job');
    setSeverity('normal');
    setSubject('');
    setBody('');
    setComposing(true);
  };

  const submit = async () => {
    // Say what is actually wrong and by how much. These alerts used to just
    // restate the placeholder text, so a report rejected for being 3
    // characters short read as "nothing happened when I pressed send".
    const titleLen = subject.trim().length;
    if (titleLen < MIN_SUBJECT) {
      alert(
        'Title is too short',
        titleLen === 0
          ? 'Add a short title — one line describing what went wrong.'
          : `The title needs at least ${MIN_SUBJECT} characters. Add ${MIN_SUBJECT - titleLen} more.`
      );
      return;
    }
    const bodyLen = body.trim().length;
    if (bodyLen < MIN_BODY) {
      alert(
        'Tell us a bit more',
        bodyLen === 0
          ? 'Describe what you were doing and what happened instead.'
          : `Please write at least ${MIN_BODY} characters — ${MIN_BODY - bodyLen} more to go.`
      );
      return;
    }
    setSending(true);
    try {
      // Attached automatically — the user should not have to know their app
      // version, and "it crashed" is far more actionable with it.
      const res = await api.createIssue({
        category: category as any,
        severity: severity as any,
        subject: subject.trim(),
        body: body.trim(),
        context: {
          platform: Platform.OS,
          app_version: Constants.expoConfig?.version || 'unknown',
          role: actor?.role || actor?.type || 'unknown',
        },
      });
      setComposing(false);
      await load();
      alert(
        'Report sent',
        `Thanks — we have it.\n\nYour reference is ${res.reference}. Quote it if you need to follow up.`
      );
    } catch (e: any) {
      alert('Could not send', e.message);
    }
    setSending(false);
  };

  const openTriage = (item: any) => {
    setTriageTarget(item);
    setTriageStatus(item.status === 'open' ? 'in_progress' : 'resolved');
    setResolution(item.resolution || '');
    setEscalate(false);
    setEscalationNote('');
  };

  const submitTriage = async () => {
    if (!triageTarget) return;
    // Closing something with no explanation leaves the reporter — who gets
    // emailed this — none the wiser about what actually happened.
    const closing = triageStatus === 'resolved' || triageStatus === 'closed';
    if (closing && resolution.trim().length < 3) {
      alert('Say what was done', 'The person who reported this is told how it was resolved.');
      return;
    }
    if (escalate && escalationNote.trim().length < 3) {
      alert('Add a note', 'Tell the platform team what you tried and why it needs them.');
      return;
    }

    setSavingTriage(true);
    try {
      const res = await api.updateIssue(triageTarget.id, {
        status: triageStatus as any,
        resolution: resolution.trim() || undefined,
        escalate: escalate || undefined,
        escalation_note: escalate ? escalationNote.trim() : undefined,
      });
      setTriageTarget(null);
      await load();

      if (escalate) {
        alert('Sent to the platform team', 'They can see it now, marked as escalated.');
      } else if (closing) {
        alert(
          'Report closed',
          res?.reporter_notified
            ? 'The person who reported it has been emailed the outcome.'
            : 'Saved. They will see the outcome next time they open the app.'
        );
      }
    } catch (e: any) {
      alert('Could not update', e.message);
    }
    setSavingTriage(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Report a problem" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} /></ScrollView>
      </View>
    );
  }

  const openCount = items.filter((i) => i.status === 'open' || i.status === 'in_progress').length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Report a problem"
        subtitle={
          isSysadmin
            ? 'Everything reported across the platform'
            : isOrgAdmin
            ? 'Reports from your organisation'
            : 'Your reports'
        }
        action={<HeaderAction icon="plus" onPress={openCompose} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <GradientButton
          title="Report a problem"
          onPress={openCompose}
          icon="exclamation-circle"
          full
        />

        {items.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon="check-circle"
              title="Nothing reported"
              message={
                isSysadmin
                  ? 'No one has reported a problem yet.'
                  : 'If something goes wrong or a number looks off, tell us here and it goes straight to the team.'
              }
            />
          </Surface>
        ) : (
          <View>
            <SectionHeader
              title={openCount > 0 ? 'Needs attention' : 'Reports'}
              count={items.length}
              icon="clipboard-list"
            />
            <View style={{ gap: spacing.sm }}>
              {items.map((item) => {
                const st = STATUS_META[item.status] || STATUS_META.open;
                const done = item.status === 'resolved' || item.status === 'closed';
                return (
                  <Surface
                    key={item.id}
                    elevation="sm"
                    style={[styles.card, done && styles.cardDone]}
                    onPress={canTriage ? () => openTriage(item) : undefined}
                  >
                    <View style={styles.cardHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {CATEGORY_LABEL[item.category] || item.category} · {whenLabel(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.badgeStack}>
                        <Badge label={st.label} tone={st.tone} small />
                        {item.escalated_at && !done ? (
                          <Badge label="With platform" tone="accent" small />
                        ) : null}
                      </View>
                    </View>

                    <Text style={styles.bodyText} numberOfLines={done ? 2 : 4}>{item.body}</Text>

                    <View style={styles.tags}>
                      {item.severity !== 'normal' && (
                        <Badge
                          label={SEVERITIES.find((s) => s.value === item.severity)?.label || item.severity}
                          tone={SEVERITY_TONE[item.severity] || 'neutral'}
                          small
                        />
                      )}
                      <Text style={styles.ref}>{item.reference}</Text>
                      {/* Who and where only matter to someone triaging other
                          people's reports — on your own it is just noise. */}
                      {(isSysadmin || isOrgAdmin) && (
                        <Text style={styles.who} numberOfLines={1}>
                          {item.reporter_name}
                          {item.reporter_role ? ` · ${item.reporter_role}` : ''}
                          {item.branch_name ? ` · ${item.branch_name}` : ''}
                        </Text>
                      )}
                    </View>

                    {item.escalation_note && !done ? (
                      <View style={styles.escalationBox}>
                        <Icon name="level-up-alt" size={10} color={colors.accent} />
                        <Text style={styles.escalationText}>{item.escalation_note}</Text>
                      </View>
                    ) : null}

                    {item.resolution ? (
                      <View style={styles.resolutionBox}>
                        <Icon name="check" size={10} color={colors.success} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resolutionText}>{item.resolution}</Text>
                          {/* A resolution the reporter never received is only
                              half done — say so rather than implying they know. */}
                          {canTriage && done && item.reporter_email ? (
                            <Text style={styles.notifyNote}>
                              {item.resolved_notified_at
                                ? 'Reporter was emailed'
                                : 'Reporter was NOT emailed — tell them directly'}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ) : null}

                    {/* A report that never reached support is worse than one
                        that was never filed — the user thinks it was sent. */}
                    {isSysadmin && item.email_error ? (
                      <View style={styles.mailWarn}>
                        <Icon name="exclamation-triangle" size={10} color={colors.warning} />
                        <Text style={styles.mailWarnText} numberOfLines={2}>
                          Email notification failed — saved here only.
                        </Text>
                      </View>
                    ) : null}
                  </Surface>
                );
              })}
            </View>
          </View>
        )}

        {canTriage && items.length > 0 && (
          <View style={styles.hint}>
            <Icon name="info-circle" size={11} color={colors.textMuted} />
            <Text style={styles.hintText}>
              {isOrgAdmin
                ? 'Tap a report to work on it. Fix what you can and record how — the reporter is emailed. Anything that needs the software changed, send to the platform team.'
                : 'Tap a report to mark it as being looked at, or record how it was fixed. The reporter is emailed the outcome.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Compose ── */}
      <FormSheet
        visible={composing}
        onClose={() => setComposing(false)}
        title="Report a problem"
        subtitle="Goes straight to the team"
        submitLabel="Send report"
        onSubmit={submit}
        submitting={sending}
      >
        <PillPicker
          label="What kind of problem?"
          value={category}
          onChange={(v: any) => setCategory(v)}
          options={CATEGORIES}
        />

        <PillPicker
          label="How bad is it?"
          value={severity}
          onChange={(v: any) => setSeverity(v)}
          options={SEVERITIES}
        />

        <Field
          label="Short title"
          required
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Scanner will not open"
          maxLength={200}
        />

        <Field
          label="What happened?"
          required
          value={body}
          onChangeText={setBody}
          placeholder="What were you doing, and what happened instead?"
          multiline
          hint={
            body.trim().length > 0 && body.trim().length < MIN_BODY
              ? `${MIN_BODY - body.trim().length} more character${MIN_BODY - body.trim().length === 1 ? '' : 's'} needed`
              : 'Your name, role and app version are attached automatically.'
          }
          style={{ marginBottom: 0 }}
        />
      </FormSheet>

      {/* ── Triage (sysadmin) ── */}
      <FormSheet
        visible={!!triageTarget}
        onClose={() => setTriageTarget(null)}
        title="Update report"
        subtitle={triageTarget?.reference}
        submitLabel="Save"
        onSubmit={submitTriage}
        submitting={savingTriage}
      >
        {triageTarget ? (
          <Surface elevation="none" tone={colors.bgSunken} borderless style={styles.triageQuote}>
            <Text style={styles.triageSubject}>{triageTarget.subject}</Text>
            <Text style={styles.triageBody}>{triageTarget.body}</Text>
            <Text style={styles.triageFrom}>
              {triageTarget.reporter_name}
              {triageTarget.org_name ? ` · ${triageTarget.org_name}` : ''}
            </Text>
          </Surface>
        ) : null}

        <PillPicker
          label="Status"
          value={triageStatus}
          onChange={(v: any) => setTriageStatus(v)}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'Looking at it' },
            { value: 'resolved', label: 'Fixed' },
            { value: 'closed', label: 'Closed' },
          ]}
        />

        <Field
          label="What was done"
          required={triageStatus === 'resolved' || triageStatus === 'closed'}
          value={resolution}
          onChangeText={setResolution}
          placeholder="e.g. Corrected the price at your branch"
          multiline
          hint="Emailed to whoever reported it."
          style={{ marginBottom: isOrgAdmin ? spacing.lg : 0 }}
        />

        {/* Only an org admin sees this: there is no tier above the platform
            team to hand a report to. */}
        {isOrgAdmin && !triageTarget?.escalated_at && (
          <>
            <TouchableOpacity
              style={[styles.escalateToggle, escalate && styles.escalateToggleOn]}
              onPress={() => setEscalate((v) => !v)}
              activeOpacity={0.7}
            >
              <Icon
                name={escalate ? 'check-square' : 'square'}
                size={13}
                color={escalate ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.escalateText, escalate && { color: colors.accent }]}>
                I cannot fix this — send it to the platform team
              </Text>
            </TouchableOpacity>

            {escalate && (
              <Field
                label="What have you tried?"
                required
                value={escalationNote}
                onChangeText={setEscalationNote}
                placeholder="e.g. Checked the branch settings, the app still crashes"
                multiline
                style={{ marginBottom: 0, marginTop: spacing.md }}
              />
            )}
          </>
        )}

        {isOrgAdmin && triageTarget?.escalated_at && (
          <View style={styles.alreadyEscalated}>
            <Icon name="level-up-alt" size={11} color={colors.accent} />
            <Text style={styles.alreadyEscalatedText}>
              Already with the platform team.
            </Text>
          </View>
        )}
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  card: { gap: spacing.sm },
  cardDone: { opacity: 0.72 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  subject: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
  bodyText: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 18 },

  tags: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  ref: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.caps },
  who: { flex: 1, fontSize: font.micro, color: colors.textMuted, textAlign: 'right' },

  badgeStack: { alignItems: 'flex-end', gap: 4 },

  escalationBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.accentSoft, borderRadius: radii.sm,
    paddingVertical: 8, paddingHorizontal: spacing.md,
  },
  escalationText: { flex: 1, fontSize: font.xs, color: colors.accent, fontWeight: weight.semibold, lineHeight: 16 },

  notifyNote: { fontSize: font.micro, color: colors.textMuted, marginTop: 3 },

  escalateToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radii.md, backgroundColor: colors.bgSunken,
  },
  escalateToggleOn: { backgroundColor: colors.accentSoft },
  escalateText: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },

  alreadyEscalated: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.xs },
  alreadyEscalatedText: { fontSize: font.xs, color: colors.accent, fontWeight: weight.semibold },

  resolutionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.successSoft, borderRadius: radii.sm,
    paddingVertical: 8, paddingHorizontal: spacing.md,
  },
  resolutionText: { flex: 1, fontSize: font.xs, color: colors.success, fontWeight: weight.semibold, lineHeight: 16 },

  mailWarn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mailWarnText: { flex: 1, fontSize: font.micro, color: colors.warning, fontWeight: weight.semibold },

  triageQuote: { gap: 4, marginBottom: spacing.lg },
  triageSubject: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.text },
  triageBody: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 17 },
  triageFrom: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
