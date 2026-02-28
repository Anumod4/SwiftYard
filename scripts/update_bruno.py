import os

root_dir = "/Users/anumod/Downloads/swiftyard-&-turso---carrier-yard-driver API/bruno-api-collection"

def update_bru_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    if "X-Facility-ID" in content:
        print(f"Skipping {filepath} - already has header")
        return
    
    # Check if there is an existing headers block
    if "headers {" in content:
        # Add to existing block
        lines = content.splitlines()
        new_lines = []
        in_headers = False
        for line in lines:
            new_lines.append(line)
            if line.strip().startswith("headers {"):
                in_headers = True
                new_lines.append("  X-Facility-ID: {{facilityId}}")
        content = "\n".join(new_lines)
    else:
        # Append new headers block before any body or script blocks, or at the end
        # Typically headers go after the method block (get/post/put/delete)
        # But for simplicity, we can just append it if not found.
        content += "\nheaders {\n  X-Facility-ID: {{facilityId}}\n}\n"
    
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Updated {filepath}")

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".bru"):
            update_bru_file(os.path.join(root, file))
