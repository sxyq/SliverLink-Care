package com.silverlink.care.common;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BeanAccessorReflectionTest {

    @TestFactory
    Stream<DynamicTest> beanAccessorsRoundTrip() throws Exception {
        return discoverBeanClasses().stream()
                .flatMap(clazz -> writableProperties(clazz).stream()
                        .map(property -> DynamicTest.dynamicTest(
                                clazz.getSimpleName() + "." + property.setter.getName(),
                                () -> assertSetterGetterRoundTrip(clazz, property)
                        )));
    }

    private static List<Class<?>> discoverBeanClasses() throws Exception {
        Path sourceRoot = Path.of("src/main/java");
        if (!Files.exists(sourceRoot)) {
            return List.of();
        }
        List<Class<?>> classes = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(sourceRoot)) {
            for (Path path : paths.filter(path -> path.toString().endsWith(".java")).toList()) {
                String fileName = path.getFileName().toString();
                if (!isBeanLike(fileName)) {
                    continue;
                }
                String className = sourceRoot.relativize(path)
                        .toString()
                        .replace('/', '.')
                        .replace('\\', '.')
                        .replaceAll("\\.java$", "");
                Class<?> clazz = Class.forName(className);
                if (!Modifier.isAbstract(clazz.getModifiers()) && hasNoArgConstructor(clazz)) {
                    classes.add(clazz);
                }
            }
        }
        return classes;
    }

    private static boolean isBeanLike(String fileName) {
        return fileName.endsWith("Dto.java")
                || fileName.endsWith("Request.java")
                || fileName.endsWith("Response.java")
                || fileName.endsWith("Result.java")
                || fileName.endsWith("Entity.java")
                || fileName.equals("CurrentUser.java");
    }

    private static boolean hasNoArgConstructor(Class<?> clazz) {
        try {
            Constructor<?> constructor = clazz.getDeclaredConstructor();
            return !Modifier.isPrivate(constructor.getModifiers());
        } catch (NoSuchMethodException ex) {
            return false;
        }
    }

    private static List<PropertyPair> writableProperties(Class<?> clazz) {
        Map<String, Method> getters = new HashMap<>();
        for (Method method : clazz.getMethods()) {
            if (method.getParameterCount() != 0 || method.getDeclaringClass() == Object.class) {
                continue;
            }
            if (method.getName().startsWith("get") && method.getName().length() > 3) {
                getters.put(Introspector.decapitalize(method.getName().substring(3)), method);
            } else if (method.getName().startsWith("is") && method.getName().length() > 2) {
                getters.put(Introspector.decapitalize(method.getName().substring(2)), method);
            }
        }

        List<PropertyPair> pairs = new ArrayList<>();
        for (Method method : clazz.getMethods()) {
            if (!method.getName().startsWith("set") || method.getParameterCount() != 1) {
                continue;
            }
            String property = Introspector.decapitalize(method.getName().substring(3));
            Method getter = getters.get(property);
            if (getter != null) {
                pairs.add(new PropertyPair(method, getter));
            }
        }
        return pairs;
    }

    private static void assertSetterGetterRoundTrip(Class<?> clazz, PropertyPair property) throws Exception {
        Object instance = clazz.getDeclaredConstructor().newInstance();
        Object value = sampleValue(property.setter.getParameterTypes()[0]);
        property.setter.invoke(instance, value);
        assertEquals(value, property.getter.invoke(instance));
    }

    private static Object sampleValue(Class<?> type) {
        if (type == String.class) return "sample";
        if (type == int.class || type == Integer.class) return 7;
        if (type == long.class || type == Long.class) return 7L;
        if (type == boolean.class || type == Boolean.class) return true;
        if (type == double.class || type == Double.class) return 7.5d;
        if (type == float.class || type == Float.class) return 7.5f;
        if (type == BigDecimal.class) return BigDecimal.valueOf(7.5);
        if (type == Instant.class) return Instant.parse("2026-05-25T00:00:00Z");
        if (type == LocalDateTime.class) return LocalDateTime.of(2026, 5, 25, 0, 0);
        if (List.class.isAssignableFrom(type)) return List.of("sample");
        if (Map.class.isAssignableFrom(type)) return Map.of("key", "value");
        if (Set.class.isAssignableFrom(type)) return Set.of("sample");
        return null;
    }

    private record PropertyPair(Method setter, Method getter) {}
}
