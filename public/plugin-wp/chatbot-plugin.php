<?php
/**
 * Plugin Name: Gemini Chatbot
 * Plugin URI:  https://iseoai.com/chatbot
 * Description: A powerful chatbot powered by Google Gemini.
 * Version:     1.0
 * Author:      iSEOAI
 * Author URI:  https://iseoai.com/
 * License:     GPL2
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: gemini-chatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

define( 'GEMINI_CHATBOT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GEMINI_CHATBOT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Enqueue scripts and styles
function gemini_chatbot_enqueue_assets() {
    // Enqueue CSS
    wp_enqueue_style(
        'gemini-chatbot-style',
        GEMINI_CHATBOT_PLUGIN_URL . 'assets/css/chatbot.css',
        array(),
        filemtime( GEMINI_CHATBOT_PLUGIN_DIR . 'assets/css/chatbot.css' )
    );

    // Enqueue JavaScript
    wp_enqueue_script(
        'gemini-chatbot-script',
        GEMINI_CHATBOT_PLUGIN_URL . 'assets/js/chatbot.js',
        array( 'jquery' ), // Dependency on jQuery if needed
        filemtime( GEMINI_CHATBOT_PLUGIN_DIR . 'assets/js/chatbot.js' ),
        true // Enqueue in the footer
    );

    // Localize script to pass data to JS
    wp_localize_script(
        'gemini-chatbot-script',
        'geminiChatbotData',
        array(
            'ajax_url' => admin_url( 'admin-ajax.php' ), // For traditional AJAX, though REST API is better
         //   'rest_url' => rest_url( 'gemini-chatbot/v1/chat' ), // For the REST API endpoint
          //  'nonce'    => wp_create_nonce( 'wp_rest' ), // Nonce for REST API security
        )
    );
}
add_action( 'wp_enqueue_scripts', 'gemini_chatbot_enqueue_assets' );

// Register the shortcode
function gemini_chatbot_shortcode() {
    ob_start();
    include GEMINI_CHATBOT_PLUGIN_DIR . 'templates/chatbot-display.php';
    return ob_get_clean();
}
add_shortcode( 'gemini_chatbot', 'gemini_chatbot_shortcode' );

// Include other necessary files
require_once GEMINI_CHATBOT_PLUGIN_DIR . 'includes/database.php';
// require_once GEMINI_CHATBOT_PLUGIN_DIR . 'includes/settings.php'; // For API key

// Activation hook
register_activation_hook( __FILE__, 'gemini_chatbot_activate' );
function gemini_chatbot_activate() {
    // Create database tables if they don't exist
    gemini_chatbot_create_chat_table();
}
