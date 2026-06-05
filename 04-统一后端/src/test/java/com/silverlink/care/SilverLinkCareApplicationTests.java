package com.silverlink.care;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
class SilverLinkCareApplicationTests {

    @Test
    void mainMethodExists() throws Exception {
        Assertions.assertNotNull(new SilverLinkCareApplication());
        Assertions.assertNotNull(
                SilverLinkCareApplication.class.getDeclaredMethod("main", String[].class)
        );
    }
}
