import { createZip, type ZipEntry } from './zip';
import type { Mesh } from './mesh';

/**
 * Writes a 3MF, which slicers prefer to STL: it carries units and an object
 * name, so the model lands at the right size without anyone guessing.
 *
 * Vertices are deduplicated on the way in. STL repeats every vertex three
 * times; 3MF indexes them, and a height-map mesh shares most of its corners
 * between neighbouring triangles.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

const RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (char) =>
    char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '&' ? '&amp;' : char === '"' ? '&quot;' : '&apos;',
  );

/** Rounded to a micron, which is also what makes shared vertices compare equal. */
const round = (value: number) => Math.round(value * 1000) / 1000;

export interface IndexedMesh {
  vertices: number[];
  triangles: number[];
}

export function indexMesh(mesh: Mesh): IndexedMesh {
  const lookup = new Map<string, number>();
  const vertices: number[] = [];
  const triangles: number[] = [];

  for (let i = 0; i < mesh.triangleCount * 9; i += 3) {
    const x = round(mesh.positions[i]);
    const y = round(mesh.positions[i + 1]);
    const z = round(mesh.positions[i + 2]);

    const key = `${x},${y},${z}`;
    let index = lookup.get(key);
    if (index === undefined) {
      index = vertices.length / 3;
      lookup.set(key, index);
      vertices.push(x, y, z);
    }
    triangles.push(index);
  }

  return { vertices, triangles };
}

export function buildModelXml(mesh: Mesh, name: string): string {
  const { vertices, triangles } = indexMesh(mesh);

  const vertexXml: string[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    vertexXml.push(`<vertex x="${vertices[i]}" y="${vertices[i + 1]}" z="${vertices[i + 2]}" />`);
  }

  const triangleXml: string[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    triangleXml.push(
      `<triangle v1="${triangles[i]}" v2="${triangles[i + 1]}" v3="${triangles[i + 2]}" />`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Application">HueForge</metadata>
<metadata name="Title">${escapeXml(name)}</metadata>
<resources>
<object id="1" type="model" name="${escapeXml(name)}">
<mesh>
<vertices>
${vertexXml.join('\n')}
</vertices>
<triangles>
${triangleXml.join('\n')}
</triangles>
</mesh>
</object>
</resources>
<build>
<item objectid="1" />
</build>
</model>`;
}

export function write3mf(mesh: Mesh, name: string, now?: Date): Uint8Array {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    { path: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { path: '_rels/.rels', data: encoder.encode(RELATIONSHIPS) },
    { path: '3D/3dmodel.model', data: encoder.encode(buildModelXml(mesh, name)) },
  ];
  return createZip(entries, now);
}
