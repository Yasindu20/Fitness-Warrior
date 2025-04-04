//index.tsx
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AuthLayout from "./_layout";

export default function AuthIndex() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6200ee" />
      <AuthLayout />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
});
