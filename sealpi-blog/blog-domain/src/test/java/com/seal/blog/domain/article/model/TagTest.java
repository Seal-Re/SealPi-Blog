package com.seal.blog.domain.article.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit tests for the Tag domain model — no Spring context required.
 */
class TagTest {

    @Test
    void constructor_nullName_throwsIllegalState() {
        assertThatThrownBy(() -> new Tag(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("name is required");
    }

    @Test
    void constructor_validName_setsCountToZero() {
        Tag tag = new Tag("Java");
        assertThat(tag.getCount()).isEqualTo(0);
        assertThat(tag.getName()).isEqualTo("Java");
    }

    @Test
    void modify_updatesNameAndCount() {
        Tag tag = new Tag("Java");
        tag.modify("Spring", 5);
        assertThat(tag.getName()).isEqualTo("Spring");
        assertThat(tag.getCount()).isEqualTo(5);
    }

    @Test
    void modify_nullName_throwsIllegalState() {
        Tag tag = new Tag("Java");
        assertThatThrownBy(() -> tag.modify(null, 1))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void modify_negativeCount_throwsIllegalState() {
        Tag tag = new Tag("Java");
        assertThatThrownBy(() -> tag.modify("Java", -1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("count");
    }

    @Test
    void assignId_setsIdWhenNull() {
        Tag tag = new Tag("Java");
        tag.assignId(7);
        assertThat(tag.getTagId()).isEqualTo(7);
    }

    @Test
    void assignId_throwsWhenAlreadySet() {
        Tag tag = Tag.reconstruct(3, "Java", 5);
        assertThatThrownBy(() -> tag.assignId(4))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("已有id");
    }

    @Test
    void reconstruct_nullName_usesEmptyString() {
        Tag tag = Tag.reconstruct(1, null, 0);
        assertThat(tag.getName()).isEqualTo("");
    }

    @Test
    void reconstruct_nullCount_usesZero() {
        Tag tag = Tag.reconstruct(1, "Java", null);
        assertThat(tag.getCount()).isEqualTo(0);
    }

    @Test
    void reconstruct_setsTagId() {
        Tag tag = Tag.reconstruct(99, "Go", 10);
        assertThat(tag.getTagId()).isEqualTo(99);
    }
}
