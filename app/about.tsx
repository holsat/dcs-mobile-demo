import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Get platform name
  const platformName = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
  
  // Get app version from app.json via Constants
  const appVersion = Constants.expoConfig?.version || '0.1';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'About',
          headerBackTitle: 'Settings',
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      >
        <View style={styles.content}>
          {/* App Title */}
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            GOA Digital Chant Stand+
          </Text>
          <Text style={[styles.subtitle, { color: Colors[colorScheme ?? 'light'].icon }]}>
            for {platformName} {appVersion}
          </Text>
          
          {/* DCS+ Application Info */}
          <View style={styles.section}>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              DCS+ Application © 2025 Sheldon Lee-Wen
            </Text>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: Colors[colorScheme ?? 'light'].text }]}>
              Email
            </Text>
            <Text
              style={[styles.link, { color: '#007AFF' }]}
              onPress={() => Linking.openURL('mailto:dcsplus@gmail.com')}
            >
              dcsplus@gmail.com
            </Text>
          </View>

          {/* Content Copyright Notice */}
          <View style={styles.section}>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              Content Copyright notice reproduced from the GOA DCS application below:
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              © 2025 Greek Orthodox Archdiocese of America
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }, styles.marginTop]}>
              AGES Initiatives is now a part of the Greek Orthodox Archdiocese of America. The Digital Chant Stand of the Greek Orthodox Archdiocese of America will continue to provide resources intended to enhance the worship experience of the Orthodox faithful with easily accessible liturgical texts and music.
            </Text>
          </View>

          {/* Sources */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: Colors[colorScheme ?? 'light'].text }]}>
              Sources
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              [AC] Anthony Cook.{'\n'}
              [AGH] Fr. Andreas Houpos.{'\n'}
              [GKD] George K. Duvall.{'\n'}
              [KW] Metropolitan Kallistos Ware.{'\n'}
              [RB] Richard Barrett.{'\n'}
              [SD] Fr. Seraphim Dedes.{'\n'}
              [TC] Thomas Carroll.{'\n'}
              [VPA] Virgil Fr. Peter Andronache.{'\n'}
              [GOA] Greek Orthodox Archdiocese of America.{'\n'}
              [HC] Holy Cross Orthodox Press.{'\n'}
              [OCA] Orthodox Church in America.
            </Text>
          </View>

          {/* Scripture Versions */}
          <View style={styles.section}>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              NKJV Scripture taken from the New King James Version™. Copyright © 1982 by Thomas Nelson, Inc. Used by permission. All rights reserved.
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }, styles.marginTop]}>
              RSV Revised Standard Version of the Bible, copyright © 1946, 1952, and 1971 National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved.
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }, styles.marginTop]}>
              SAAS Scripture taken from the St. Athanasius Academy Septuagint™. Copyright © 2008 by St. Athanasius Academy of Orthodox Theology. Used by permission. All rights reserved.
            </Text>
          </View>

          {/* Disclaimer */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: Colors[colorScheme ?? 'light'].text }]}>
              Disclaimer
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              The translations, rubrics, Greek and English texts are for the purposes of worship only and are subject to change without notice at the discretion of the Greek Orthodox Archdiocese of America.
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }, styles.marginTop]}>
              All rights reserved. The content contained herein remains the property of all contributing translators. It is published solely for the purpose of providing a source of worship materials to the parishes of the Orthodox Church and may be copied and otherwise reproduced as needed by the parish toward this end; however, it may not be reprinted, reproduced, transmitted, stored in a retrieval system, or translated into any language in any form by any means—electronic, mechanical, recording, or otherwise—for the purpose of sale without the express written permission of the Greek Orthodox Archdiocese of America.
            </Text>
          </View>

          {/* GOA DCS Links */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: Colors[colorScheme ?? 'light'].text }]}>
              GOA DCS Website
            </Text>
            <Text
              style={[styles.link, { color: '#007AFF' }]}
              onPress={() => Linking.openURL('https://dcs.goarch.org')}
            >
              dcs.goarch.org
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.heading, { color: Colors[colorScheme ?? 'light'].text }]}>
              Email
            </Text>
            <Text
              style={[styles.link, { color: '#007AFF' }]}
              onPress={() => Linking.openURL('mailto:dcsinfo@goarch.org')}
            >
              dcsinfo@goarch.org
            </Text>
          </View>

          {/* Fonts */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: Colors[colorScheme ?? 'light'].text }]}>
              Fonts
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }]}>
              Font copyright © 2010 Google Corporation with Reserved Font Arimo, Tinos and Cousine.
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }, styles.marginTop]}>
              Copyright © 2012 Red Hat, Inc. with Reserved Font Name Liberation.
            </Text>
            <Text style={[styles.body, { color: Colors[colorScheme ?? 'light'].text }, styles.marginTop]}>
              This Font Software is licensed under the SIL Open Font License, Version 1.1.
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  marginTop: {
    marginTop: 12,
  },
});
