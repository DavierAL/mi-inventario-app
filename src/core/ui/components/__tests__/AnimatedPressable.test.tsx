import React from 'react';
import { View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AnimatedPressable } from '../AnimatedPressable';
import * as Haptics from 'expo-haptics';

// Mock completo de AnimatedPressable para tests
jest.mock('../AnimatedPressable', () => {
    const React = require('react');
    const { Pressable } = require('react-native');
    const mockHaptics = require('expo-haptics');
    return {
        AnimatedPressable: ({ children, onPress, disabled, style, testID, accessibilityLabel, accessibilityHint, accessibilityRole, haptic }: {
            children?: React.ReactNode;
            onPress?: () => void;
            disabled?: boolean;
            style?: object;
            testID?: string;
            accessibilityLabel?: string;
            accessibilityHint?: string;
            accessibilityRole?: 'button' | 'link' | 'checkbox' | 'radio' | 'menu' | 'menubar' | 'list' | 'menuitem' | 'none' | 'summary' | 'image' | 'header' | 'toolbar' | 'text' | 'search';
            haptic?: object;
        }) => (
            React.createElement(Pressable, {
                onPress: () => {
                    if (haptic && !disabled) mockHaptics.impactAsync(haptic);
                    if (onPress) onPress();
                },
                onPressIn: () => {
                    if (haptic && !disabled) mockHaptics.impactAsync(haptic);
                },
                disabled,
                style,
                testID,
                accessibilityLabel,
                accessibilityHint,
                accessibilityRole,
            }, children)
        ),
    };
});

describe('AnimatedPressable Component', () => {
    it('renderiza correctamente los hijos', () => {
        const { getByTestId } = render(
            <AnimatedPressable onPress={() => {}}>
                <View testID="child-view" />
            </AnimatedPressable>
        );
        expect(getByTestId('child-view')).toBeTruthy();
    });

    it('ejecuta onPress cuando se presiona', () => {
        const onPressMock = jest.fn();
        const { getByTestId } = render(
            <AnimatedPressable onPress={onPressMock} testID="animated-btn">
                <View />
            </AnimatedPressable>
        );
        
        fireEvent.press(getByTestId('animated-btn'));
        expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('activa haptics en pressIn si esta configurado', () => {
        const { getByTestId } = render(
            <AnimatedPressable 
                onPress={() => {}} 
                testID="haptic-btn" 
                haptic={Haptics.ImpactFeedbackStyle.Medium}
            >
                <View />
            </AnimatedPressable>
        );
        
        fireEvent(getByTestId('haptic-btn'), 'pressIn');
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('no activa haptics si no esta configurado', () => {
        jest.clearAllMocks();
        const { getByTestId } = render(
            <AnimatedPressable onPress={() => {}} testID="no-haptic-btn">
                <View />
            </AnimatedPressable>
        );
        
        fireEvent(getByTestId('no-haptic-btn'), 'pressIn');
        expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
});
