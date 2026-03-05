<?php
/**
 * Plugin Name: FILEHUB Blog API
 * Description: API endpoint seguro para publicar desde FILEHUB
 * Version: 1.0
 */

// Secret key for authentication
define('FILEHUB_SECRET', 'REDACTED_FH_WP_2026-04');

add_action('rest_api_init', function() {
    // Post creation endpoint
    register_rest_route('filehub/v1', '/publish', array(
        'methods' => 'POST',
        'callback' => 'filehub_publish_post',
        'permission_callback' => 'filehub_check_auth',
    ));
    // Media upload endpoint
    register_rest_route('filehub/v1', '/upload', array(
        'methods' => 'POST',
        'callback' => 'filehub_upload_media',
        'permission_callback' => 'filehub_check_auth',
    ));
    // Categories endpoint
    register_rest_route('filehub/v1', '/categories', array(
        'methods' => 'GET',
        'callback' => 'filehub_get_categories',
        'permission_callback' => 'filehub_check_auth',
    ));
    // Posts list endpoint
    register_rest_route('filehub/v1', '/posts', array(
        'methods' => 'GET',
        'callback' => 'filehub_get_posts',
        'permission_callback' => 'filehub_check_auth',
    ));
    // Tags endpoint
    register_rest_route('filehub/v1', '/tag', array(
        'methods' => 'POST',
        'callback' => 'filehub_create_tag',
        'permission_callback' => 'filehub_check_auth',
    ));
    // Delete post endpoint
    register_rest_route('filehub/v1', '/delete/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'filehub_delete_post',
        'permission_callback' => 'filehub_check_auth',
    ));
    // Status/ping endpoint
    register_rest_route('filehub/v1', '/status', array(
        'methods' => 'GET',
        'callback' => 'filehub_status',
        'permission_callback' => 'filehub_check_auth',
    ));
});

function filehub_check_auth($request) {
    $auth = $request->get_header('X-Filehub-Key');
    if (!$auth) {
        $auth = $request->get_param('key');
    }
    return $auth === FILEHUB_SECRET;
}

function filehub_status() {
    $count = wp_count_posts();
    return new WP_REST_Response(array(
        'ok' => true,
        'total_posts' => $count->publish + $count->draft,
        'published' => $count->publish,
        'drafts' => $count->draft,
    ), 200);
}

function filehub_publish_post($request) {
    $params = $request->get_json_params();
    $post_data = array(
        'post_title'   => sanitize_text_field($params['title'] ?? 'Sin título'),
        'post_content' => wp_kses_post($params['content'] ?? ''),
        'post_excerpt' => sanitize_text_field($params['excerpt'] ?? ''),
        'post_status'  => in_array($params['status'] ?? 'draft', array('publish','draft')) ? $params['status'] : 'draft',
        'post_author'  => 1,
    );
    if (!empty($params['categories'])) {
        $post_data['post_category'] = array_map('intval', (array)$params['categories']);
    }
    $post_id = wp_insert_post($post_data, true);
    if (is_wp_error($post_id)) {
        return new WP_REST_Response(array('error' => $post_id->get_error_message()), 500);
    }
    // Tags
    if (!empty($params['tags'])) {
        wp_set_post_tags($post_id, array_map('intval', (array)$params['tags']), true);
    }
    // Featured image
    if (!empty($params['featured_media'])) {
        set_post_thumbnail($post_id, intval($params['featured_media']));
    }
    $post = get_post($post_id);
    return new WP_REST_Response(array(
        'id' => $post_id,
        'title' => $post->post_title,
        'link' => get_permalink($post_id),
        'status' => $post->post_status,
    ), 201);
}

function filehub_upload_media($request) {
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');

    $files = $request->get_file_params();
    if (empty($files['file'])) {
        return new WP_REST_Response(array('error' => 'No file provided'), 400);
    }
    $upload = wp_handle_upload($files['file'], array('test_form' => false));
    if (isset($upload['error'])) {
        return new WP_REST_Response(array('error' => $upload['error']), 500);
    }
    $attachment = array(
        'post_mime_type' => $upload['type'],
        'post_title'     => sanitize_file_name(pathinfo($upload['file'], PATHINFO_FILENAME)),
        'post_content'   => '',
        'post_status'    => 'inherit',
    );
    $attach_id = wp_insert_attachment($attachment, $upload['file']);
    $metadata = wp_generate_attachment_metadata($attach_id, $upload['file']);
    wp_update_attachment_metadata($attach_id, $metadata);

    return new WP_REST_Response(array(
        'id' => $attach_id,
        'source_url' => wp_get_attachment_url($attach_id),
        'mime_type' => $upload['type'],
    ), 201);
}

function filehub_get_categories() {
    $cats = get_categories(array('hide_empty' => false));
    $result = array();
    foreach ($cats as $cat) {
        $result[] = array('id' => $cat->term_id, 'name' => $cat->name, 'count' => $cat->count);
    }
    return new WP_REST_Response($result, 200);
}

function filehub_get_posts($request) {
    $per_page = intval($request->get_param('per_page') ?: 15);
    $posts = get_posts(array(
        'numberposts' => $per_page,
        'post_status' => array('publish', 'draft'),
        'orderby' => 'date',
        'order' => 'DESC',
    ));
    $result = array();
    foreach ($posts as $p) {
        $result[] = array(
            'id' => $p->ID,
            'title' => $p->post_title,
            'link' => get_permalink($p->ID),
            'status' => $p->post_status,
            'date' => $p->post_date,
        );
    }
    return new WP_REST_Response($result, 200);
}

function filehub_create_tag($request) {
    $params = $request->get_json_params();
    $name = sanitize_text_field($params['name'] ?? '');
    if (!$name) return new WP_REST_Response(array('error' => 'Name required'), 400);
    
    // Check if exists
    $existing = get_term_by('name', $name, 'post_tag');
    if ($existing) {
        return new WP_REST_Response(array('id' => $existing->term_id, 'name' => $existing->name), 200);
    }
    $result = wp_insert_term($name, 'post_tag');
    if (is_wp_error($result)) {
        return new WP_REST_Response(array('error' => $result->get_error_message()), 500);
    }
    return new WP_REST_Response(array('id' => $result['term_id'], 'name' => $name), 201);
}

function filehub_delete_post($request) {
    $id = intval($request['id']);
    $result = wp_delete_post($id, true);
    if (!$result) {
        return new WP_REST_Response(array('error' => 'Could not delete'), 500);
    }
    return new WP_REST_Response(array('deleted' => true, 'id' => $id), 200);
}
