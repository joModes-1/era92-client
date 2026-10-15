import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, font, spacing, weight, tracking } from '../theme';
import ComponentButton1 from '../components/buttons/ComponentButton1';
import CarWashLogo from '../components/CarWashLogo';
import GradientText from '../components/GradientText';

/**
 * The very first screen anyone sees, right after the splash.
 *
 * White and full-bleed, not the dark AuthShell chrome the staff screens
 * use — this is the customer's front door, and it is meant to read like a
 * consumer app landing page, not an operations tool. "Continue with phone
 * number" is the one action that matters; everything else is secondary.
 *
 * Staff never land here by choice — they open the same app but need the
 * username/password screen instead. Rather than a separate app or a hidden
 * gesture, they get a small text link at the bottom. It is deliberately
 * quiet: the loudest thing on this screen has to stay the phone button, or
 * the screen stops doing its one job.
 */
export default function WelcomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.brandRow}>
        <CarWashLogo height={32} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.headline}>TRUSTED &</Text>
        <Text style={s.headline}>AFFORDABLE</Text>
        <View style={s.carWashRow}>
          <GradientText
            text="CAR WASH"
            style={s.carWashText}
            colorsArr={colors.gradientHeadline}
            locations={colors.gradientHeadlineLocations}
            start={colors.gradientHeadlineStart}
            end={colors.gradientHeadlineEnd}
          />
          <Image
            source={require('../../assets/services/full-car-wash.png')}
            style={s.carWashIcon}
            resizeMode="contain"
          />
        </View>
      </ScrollView>

      <View style={s.footer}>
        <ComponentButton1
          title="Continue with phone number"
          onPress={() => navigation.navigate('Register')}
        />

        <Text style={s.legal}>
          By signing up you automatically accept our{' '}
          <Text style={s.legalLink}>Terms & Conditions</Text>, privacy policy and cookie policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgCard },

  brandRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  // Children are laid out against the left gutter (16px in the design),
  // not centred: the headline block is deliberately narrower than the
  // screen and hangs off the left edge.
  body: {
    flexGrow: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // Left-aligned in a fixed-width block — the lines break on their own at
  // that width, which is what gives the headline its stepped left edge.
  // Centring it loses that entirely. The width is tied to fontSize: wide
  // enough that "TRUSTED &" fits on one line, narrow enough that "AFFORDABLE"
  // still wraps to its own — re-check this whenever fontSize changes, since
  // a bigger size needs a wider block just to keep the same line breaks.
  headline: {
    width: 280,
    textAlign: 'left',
    fontSize: 40,
    fontWeight: weight.black,
    fontStyle: 'italic',
    color: colors.text,
    letterSpacing: tracking.tight,
    lineHeight: 48,
  },
  // "CAR WASH": a stand-in for Konsens Extrabold Italic (not a Google Font,
  // so not installable the way Poppins/Instrument Sans are — swap this for
  // the real face once that file is in hand) painted with the design's
  // actual visible gradient, #AC00FF -> #283B8F at its given angle. The
  // Figma layer lists a flat black on top of that gradient, which by CSS
  // layering rules would hide it entirely — but the design's own preview
  // shows the gradient, not black, so the black entry is disregarded here
  // in favour of what is actually visible in the source.
  carWashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  carWashText: {
    fontFamily: 'Poppins_900Black_Italic',
    fontSize: 40,
    lineHeight: 32,
    letterSpacing: 0,
    textTransform: 'uppercase',
    color: '#000',
  },
  // The same render used on the "Full car wash" service tile, reused here
  // per the design rather than a new export. Figma's own layer panel lists
  // this at "-180deg", but that reading is for a source image already
  // authored upside down in that specific frame — applied to this asset it
  // renders wheels-up, so it is left unrotated to match how it actually
  // looks the right way up. The source art faces left; mirrored horizontally
  // here so the car reads as driving toward "CAR WASH", not away from it.
  carWashIcon: {
    width: 36,
    height: 32,
    transform: [{ scaleX: -1 }],
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  legal: {
    fontSize: font.micro,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  legalLink: { color: colors.primary, fontWeight: weight.semibold },
});
