from flask import Flask, render_template, jsonify, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import time
from datetime import datetime

app = Flask(__name__)

# Cache configuration (5 minutes)
CACHE_DURATION_SECONDS = 300
cache = {
    'releases': None,
    'last_fetched': 0,
    'raw_xml': None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed(force_refresh=False):
    global cache
    current_time = time.time()
    
    # Return cache if valid and force_refresh is False
    if cache['releases'] is not None and (current_time - cache['last_fetched'] < CACHE_DURATION_SECONDS) and not force_refresh:
        return cache['releases'], cache['last_fetched'], False

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    req = urllib.request.Request(FEED_URL, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            cache['raw_xml'] = xml_data
            
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        parsed_entries = []
        entries = root.findall('atom:entry', ns)
        
        for entry in entries:
            # Parse Date
            title_el = entry.find('atom:title', ns)
            date_str = title_el.text if title_el is not None else "Unknown Date"
            
            # Parse Updated timestamp
            updated_el = entry.find('atom:updated', ns)
            updated_str = updated_el.text if updated_el is not None else ""
            
            # Parse ID
            id_el = entry.find('atom:id', ns)
            entry_id = id_el.text if id_el is not None else ""
            
            # Parse Content HTML
            content_el = entry.find('atom:content', ns)
            if content_el is None or not content_el.text:
                continue
                
            content_html = content_el.text
            
            # Find all <h3>...</h3> headers
            matches = list(re.finditer(r'<h3>(.*?)</h3>', content_html, re.IGNORECASE | re.DOTALL))
            
            if not matches:
                # Fallback: No h3 tags, treat the whole entry as one note
                plain_text = re.sub(r'<[^>]+>', '', content_html).strip()
                plain_text = re.sub(r'\s+', ' ', plain_text)
                parsed_entries.append({
                    'id': f"{entry_id}_0",
                    'date': date_str,
                    'updated_datetime': updated_str,
                    'type': 'Update',
                    'html': content_html.strip(),
                    'text': plain_text
                })
            else:
                # Text before the first <h3>, if any
                first_start = matches[0].start()
                pre_text = content_html[:first_start].strip()
                if pre_text and re.sub(r'<[^>]+>', '', pre_text).strip():
                    plain_text = re.sub(r'<[^>]+>', '', pre_text).strip()
                    plain_text = re.sub(r'\s+', ' ', plain_text)
                    parsed_entries.append({
                        'id': f"{entry_id}_pre",
                        'date': date_str,
                        'updated_datetime': updated_str,
                        'type': 'Update',
                        'html': pre_text,
                        'text': plain_text
                    })
                
                # Split entries by h3
                for i in range(len(matches)):
                    start_idx = matches[i].end()
                    end_idx = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
                    
                    note_type = matches[i].group(1).strip()
                    note_content = content_html[start_idx:end_idx].strip()
                    
                    if note_content:
                        # Clean html structure
                        plain_text = re.sub(r'<[^>]+>', '', note_content).strip()
                        plain_text = re.sub(r'\s+', ' ', plain_text)
                        parsed_entries.append({
                            'id': f"{entry_id}_{i}",
                            'date': date_str,
                            'updated_datetime': updated_str,
                            'type': note_type,
                            'html': note_content,
                            'text': plain_text
                        })
                        
        cache['releases'] = parsed_entries
        cache['last_fetched'] = current_time
        return parsed_entries, current_time, True
        
    except Exception as e:
        # Fallback to cache if feed fetching fails
        if cache['releases'] is not None:
            return cache['releases'], cache['last_fetched'], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases, last_fetched, was_refreshed = fetch_and_parse_feed(force_refresh=force_refresh)
        
        # Format last_fetched time
        dt = datetime.fromtimestamp(last_fetched)
        formatted_time = dt.strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({
            'status': 'success',
            'data': releases,
            'last_updated': formatted_time,
            'was_refreshed': was_refreshed
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"Failed to fetch or parse release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
