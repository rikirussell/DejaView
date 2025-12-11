import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/dejaview-logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>DejaView</Text>
        </View>
        <Text style={styles.tagline}>Perfect alignment, every time</Text>
      </View>

      {/* Feature Cards */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Ionicons name="layers-outline" size={32} color="#007AFF" />
          </View>
          <Text style={styles.featureTitle}>Onion-Skin Overlay</Text>
          <Text style={styles.featureDescription}>
            Load a previous photo as a semi-transparent overlay on your live camera view
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Ionicons name="move-outline" size={32} color="#007AFF" />
          </View>
          <Text style={styles.featureTitle}>Precise Alignment</Text>
          <Text style={styles.featureDescription}>
            Drag, pinch, and rotate the overlay to perfectly align your shot
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Ionicons name="git-merge-outline" size={32} color="#007AFF" />
          </View>
          <Text style={styles.featureTitle}>Smart Blending</Text>
          <Text style={styles.featureDescription}>
            Automatically merge the new shot with the original for creative effects
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/camera')}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.primaryButtonText}>Open Camera</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tap "Open Camera" to get started
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  featuresContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  featureCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});
